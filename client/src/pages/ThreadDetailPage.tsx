import React, { useState, useEffect, useCallback } from "react"
import { api } from "../api"
import type { Thread, Persona } from "../types"
import { PersonaModal } from "../components/PersonaModal"

interface ThreadDetailPageProps {
  threadId: string
}

export const ThreadDetailPage: React.FC<ThreadDetailPageProps> = ({
  threadId,
}) => {
  const [thread, setThread] = useState<Thread | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [notes, setNotes] = useState("")
  const [isOperating, setIsOperating] = useState(false)
  const [viewMode, setViewMode] = useState<"json" | "chat">("chat")
  const [personas, setPersonas] = useState<Persona[]>([])
  const [expandedThoughts, setExpandedThoughts] = useState<Set<number>>(
    new Set()
  )
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)

  const loadThread = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        const [threadData, personasData] = await Promise.all([
          api.getThread(threadId),
          api.getPersonas(),
        ])
        setThread(threadData)
        setPersonas(personasData)
      } catch (error) {
        console.error("Failed to load thread:", error)
      } finally {
        if (showLoading) {
          setLoading(false)
        }
      }
    },
    [threadId]
  )

  useEffect(() => {
    loadThread()
  }, [loadThread])

  // Polling effect for real-time updates when thread is active
  useEffect(() => {
    if (!thread) return

    // Check if thread is active
    const voteCount = thread.stream.filter(
      (event) => event.type === "VoteSchema"
    ).length
    const isFinished = voteCount >= thread.personas.length

    const findLastMarkerIndex = (markerType: string) => {
      for (let i = thread.stream.length - 1; i >= 0; i--) {
        if (thread.stream[i].type === markerType) return i
      }
      return -1
    }
    const lastPauseIndex = findLastMarkerIndex("PauseMarker")
    const lastResumeIndex = findLastMarkerIndex("ResumeMarker")
    const isPaused = lastPauseIndex !== -1 && lastPauseIndex > lastResumeIndex

    const isActive = !isPaused && !isFinished

    // Only poll if thread is active
    if (!isActive) return

    const interval = setInterval(() => {
      loadThread(false)
    }, 500)

    return () => clearInterval(interval)
  }, [thread, loadThread])

  const handlePause = async () => {
    try {
      setIsOperating(true)
      await api.pauseThread(threadId)
      await loadThread()
    } catch (error) {
      console.error("Failed to pause thread:", error)
    } finally {
      setIsOperating(false)
    }
  }

  const handleResume = async () => {
    try {
      setIsOperating(true)
      await api.resumeThread(threadId)
      await loadThread()
    } catch (error) {
      console.error("Failed to resume thread:", error)
    } finally {
      setIsOperating(false)
    }
  }

  const handleSpeak = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    try {
      setIsOperating(true)
      await api.speakInThread(threadId, message, notes || undefined)
      setMessage("")
      setNotes("")
      await loadThread()
    } catch (error) {
      console.error("Failed to speak in thread:", error)
    } finally {
      setIsOperating(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading thread...</div>
      </div>
    )
  }

  if (!thread) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "var(--error)" }}>Thread not found</div>
      </div>
    )
  }

  // Check thread state based on stream events
  const findLastMarkerIndex = (markerType: string) => {
    for (let i = thread.stream.length - 1; i >= 0; i--) {
      if (thread.stream[i].type === markerType) {
        return i
      }
    }
    return -1
  }

  // Count VoteSchemas to check if discussion is finished
  const voteCount = thread.stream.filter(
    (event) => event.type === "VoteSchema"
  ).length
  const isFinished = voteCount >= thread.personas.length

  const lastPauseIndex = findLastMarkerIndex("PauseMarker")
  const lastResumeIndex = findLastMarkerIndex("ResumeMarker")

  // Thread is paused if there's a PauseMarker and no ResumeMarker after it
  const isPaused = lastPauseIndex !== -1 && lastPauseIndex > lastResumeIndex
  const isActive = !isPaused && !isFinished

  // Helper function to get persona name from ID
  const getPersonaName = (personaId: string): string => {
    if (personaId === "AIGORA_INTERNAL_USER") {
      return "You"
    }
    const persona = personas.find((p) => p.personaId === personaId)
    return persona ? persona.name : "Unknown"
  }

  // Toggle function for secret thoughts
  const toggleSecretThoughts = (messageIndex: number) => {
    setExpandedThoughts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(messageIndex)) {
        newSet.delete(messageIndex)
      } else {
        newSet.add(messageIndex)
      }
      return newSet
    })
  }

  // Helper function to process stream events into chat messages
  const processStreamEvents = () => {
    const chatMessages: any[] = []
    const wakingBots = new Map<string, number>() // botId -> index of LoadMarker

    thread.stream.forEach((event, index) => {
      // LoadMarker + AckSchema (bot waking up)
      if (event.type === "LoadMarker" && event.loading === "AckSchema") {
        const messageItem = {
          type: "wakeup",
          personaId: event.botId,
          status: "waking", // "waking" or "awake"
          timestamp: event.timestamp,
        }
        chatMessages.push(messageItem)
        wakingBots.set(event.botId, chatMessages.length - 1)
      }
      // LoadMarker + SummarySchema (moderator distilling debate)
      else if (
        event.type === "LoadMarker" &&
        event.loading === "SummarySchema"
      ) {
        const messageItem = {
          type: "summary",
          status: "distilling", // "distilling" or "complete"
          timestamp: event.timestamp,
        }
        chatMessages.push(messageItem)
        wakingBots.set("AIGORA_INTERNAL_MODERATOR", chatMessages.length - 1)
      }
      // AckSchema (bot is now awake)
      else if (event.type === "AckSchema") {
        const wakingIndex = wakingBots.get(event.sourceId)
        if (wakingIndex !== undefined && chatMessages[wakingIndex]) {
          // Update the existing wakeup message to "awake" status
          chatMessages[wakingIndex].status = "awake"
          chatMessages[wakingIndex].ackTimestamp = event.timestamp
        }
        wakingBots.delete(event.sourceId)
      }
      // SummarySchema (moderator summary complete)
      else if (event.type === "SummarySchema") {
        const summaryIndex = wakingBots.get("AIGORA_INTERNAL_MODERATOR")
        if (summaryIndex !== undefined && chatMessages[summaryIndex]) {
          // Update the existing summary message to "complete" status
          chatMessages[summaryIndex].status = "complete"
          chatMessages[summaryIndex].ideas = event.payload?.ideas || []
          chatMessages[summaryIndex].summaryTimestamp = event.timestamp
        }
        wakingBots.delete("AIGORA_INTERNAL_MODERATOR")
      }
      // VoteSchema (bot vote)
      else if (event.type === "VoteSchema") {
        chatMessages.push({
          type: "vote",
          personaId: event.sourceId,
          voteId: event.payload?.vote_id,
          secretThoughts: event.payload?.secret_thoughts || "",
          timestamp: event.timestamp,
        })
      }
      // ThesisSchema (bot response)
      else if (event.type === "ThesisSchema") {
        const messageText = event.payload?.public_response
        if (messageText) {
          chatMessages.push({
            type: "thesis",
            personaId: event.sourceId,
            messageText,
            privateThoughts: event.payload?.secret_thoughts || "",
            timestamp: event.timestamp,
          })
        }
      }
    })

    // Check if the last event is a LoadMarker with loading:ThesisSchema or VoteSchema
    if (thread.stream.length > 0) {
      const lastEvent = thread.stream[thread.stream.length - 1]
      if (lastEvent.type === "LoadMarker") {
        if (lastEvent.loading === "ThesisSchema") {
          chatMessages.push({
            type: "thinking",
            personaId: lastEvent.botId,
            timestamp: lastEvent.timestamp,
          })
        } else if (lastEvent.loading === "VoteSchema") {
          chatMessages.push({
            type: "voting",
            personaId: lastEvent.botId,
            timestamp: lastEvent.timestamp,
          })
        }
      }
    }

    return chatMessages
  }

  // Helper function to render individual chat messages
  const renderChatMessage = (message: any, index: number) => {
    if (message.type === "thinking") {
      // Thinking message bubble (very understated)
      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              padding: "0.5rem 1rem",
              borderRadius: "16px",
              fontSize: "0.75rem",
              fontStyle: "italic",
              maxWidth: "70%",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            {getPersonaName(message.personaId)} is writing...
          </div>
        </div>
      )
    } else if (message.type === "voting") {
      // Voting message bubble (very understated)
      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              padding: "0.5rem 1rem",
              borderRadius: "16px",
              fontSize: "0.75rem",
              fontStyle: "italic",
              maxWidth: "70%",
              textAlign: "center",
              opacity: 0.7,
            }}
          >
            {getPersonaName(message.personaId)} is voting...
          </div>
        </div>
      )
    } else if (message.type === "wakeup") {
      // Wakeup/Awake message bubble (left-aligned)
      const messageText =
        message.status === "waking"
          ? `${getPersonaName(message.personaId)} is waking up...`
          : `${getPersonaName(message.personaId)} is ready!`

      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-secondary)",
              padding: "0.5rem 1rem",
              borderRadius: "16px",
              fontSize: "0.75rem",
              fontStyle: "italic",
              border: "1px solid var(--border)",
              maxWidth: "70%",
              textAlign: "center",
            }}
          >
            {messageText}
          </div>
        </div>
      )
    } else if (message.type === "summary") {
      // Summary message bubble (moderator distilling/summarizing)
      if (message.status === "distilling") {
        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "1rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-primary)",
                color: "var(--text-secondary)",
                padding: "0.5rem 1rem",
                borderRadius: "16px",
                fontSize: "0.75rem",
                fontStyle: "italic",
                border: "1px solid var(--border)",
                maxWidth: "70%",
                textAlign: "center",
              }}
            >
              Distilling debate...
            </div>
          </div>
        )
      } else {
        // Summary complete - show ideas list
        return (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              marginBottom: "1rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
                padding: "1rem",
                borderRadius: "12px",
                fontSize: "0.875rem",
                maxWidth: "90%",
                border: "2px solid #6366f1",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "0.75rem",
                  textAlign: "center",
                  fontSize: "1rem",
                }}
              >
                📋 Debate Summary
              </div>
              {message.ideas && message.ideas.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {message.ideas.map((idea: any, ideaIndex: number) => (
                    <div
                      key={ideaIndex}
                      style={{
                        backgroundColor: "var(--bg-tertiary)",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "600",
                          marginBottom: "0.5rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        {ideaIndex + 1}. {idea.thesis_name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.8rem",
                          lineHeight: "1.4",
                          marginBottom: "0.5rem",
                          opacity: 0.9,
                        }}
                      >
                        {idea.thesis_body}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                          marginTop: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            opacity: 0.8,
                            fontStyle: "italic",
                          }}
                        >
                          Authors:
                        </span>
                        {idea.authors.map(
                          (author: string, authorIndex: number) => {
                            // Handle the special case where author might be a persona name instead of ID
                            let displayName = author
                            if (author === "AIGORA_INTERNAL_USER") {
                              displayName = "You"
                            } else {
                              // Try to find by ID first, then by name
                              const personaById = personas.find(
                                (p) => p.personaId === author
                              )
                              const personaByName = personas.find(
                                (p) => p.name === author
                              )
                              if (personaById) {
                                displayName = personaById.name
                              } else if (personaByName) {
                                displayName = personaByName.name
                              } else {
                                displayName = author // Use the original value if no match found
                              }
                            }

                            return (
                              <span
                                key={authorIndex}
                                style={{
                                  backgroundColor: "#6366f1",
                                  color: "white",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "12px",
                                  fontSize: "0.7rem",
                                  fontWeight: "500",
                                  whiteSpace: "nowrap",
                                  cursor: author === "AIGORA_INTERNAL_USER" ? "default" : "pointer",
                                  transition: "opacity 0.2s ease",
                                }}
                                onClick={() => {
                                  if (author !== "AIGORA_INTERNAL_USER") {
                                    // Try to find by ID first, then by name
                                    const personaById = personas.find((p) => p.personaId === author);
                                    const personaByName = personas.find((p) => p.name === author);
                                    const persona = personaById || personaByName;
                                    if (persona) {
                                      setSelectedPersona(persona);
                                    }
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  if (author !== "AIGORA_INTERNAL_USER") {
                                    e.currentTarget.style.opacity = "0.8";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (author !== "AIGORA_INTERNAL_USER") {
                                    e.currentTarget.style.opacity = "1";
                                  }
                                }}
                              >
                                {displayName}
                              </span>
                            )
                          }
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: "center", opacity: 0.8 }}>
                  No ideas summarized
                </div>
              )}
            </div>
          </div>
        )
      }
    } else if (message.type === "vote") {
      // Vote message bubble with special styling
      const voteText =
        message.voteId === null
          ? "abstained from voting"
          : `voted for #${message.voteId}`

      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              backgroundColor: "var(--bg-primary)",
              color: "var(--text-primary)",
              padding: "0.75rem 1rem",
              borderRadius: "18px",
              fontSize: "0.875rem",
              wordBreak: "break-word",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              border: "2px solid #6366f1",
              width: "85%",
            }}
          >
            {/* Single row layout */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: message.secretThoughts ? "0.75rem" : "0",
                minHeight: "1.5rem",
              }}
            >
              {/* Icon + Name */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    lineHeight: "1",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  🗳️
                </span>
                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    lineHeight: "1",
                    cursor:
                      message.personaId === "AIGORA_INTERNAL_USER"
                        ? "default"
                        : "pointer",
                    textDecoration:
                      message.personaId === "AIGORA_INTERNAL_USER"
                        ? "none"
                        : "underline",
                    textDecorationColor: "transparent",
                    transition: "text-decoration-color 0.2s ease",
                  }}
                  onClick={() => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      const persona = personas.find(
                        (p) => p.personaId === message.personaId
                      )
                      if (persona) {
                        setSelectedPersona(persona)
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      e.currentTarget.style.textDecorationColor =
                        "var(--text-primary)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      e.currentTarget.style.textDecorationColor = "transparent"
                    }
                  }}
                >
                  {getPersonaName(message.personaId)}
                </span>
              </div>

              {/* Persona ID */}
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  fontFamily: "monospace",
                  lineHeight: "1",
                }}
              >
                #
                {message.personaId === "AIGORA_INTERNAL_USER"
                  ? "AIGORA_INTERNAL_USER"
                  : message.personaId.slice(-6)}
              </span>

              {/* Vote */}
              <span
                style={{
                  fontWeight: "500",
                  fontSize: "0.875rem",
                  flex: 1,
                  lineHeight: "1",
                }}
              >
                {voteText}
              </span>
            </div>

            {/* Secret thoughts section (always shown when present) */}
            {message.secretThoughts && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--bg-tertiary)",
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                  lineHeight: "1.4",
                  margin: "0 -1rem -0.75rem -1rem",
                  borderTop: "1px solid var(--border)",
                  borderBottomLeftRadius: "16px",
                  borderBottomRightRadius: "16px",
                }}
              >
                <div
                  style={{
                    marginBottom: "0.5rem",
                    fontWeight: "600",
                    color: "var(--text-muted)",
                  }}
                >
                  Private thoughts:
                </div>
                {message.secretThoughts}
              </div>
            )}
          </div>
        </div>
      )
    } else if (message.type === "thesis") {
      const isExpanded = expandedThoughts.has(index)
      const isUserMessage = message.personaId === "AIGORA_INTERNAL_USER"

      // Thesis message bubble with accordion
      return (
        <div
          key={index}
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.5rem",
              maxWidth: "85%",
            }}
          >
            <div
              style={{
                backgroundColor: isUserMessage
                  ? "#1e2a3a"
                  : "var(--bg-secondary)",
                color: "var(--text-primary)",
                borderRadius: "18px",
                fontSize: "0.875rem",
                wordBreak: "break-word",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
                border: isUserMessage
                  ? "1px solid #3a4a5a"
                  : "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              {/* Bot name and ID header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1rem",
                  borderBottom: isUserMessage
                    ? "1px solid #3a4a5a"
                    : "1px solid var(--border)",
                  backgroundColor: isUserMessage
                    ? "#2a3a4a"
                    : "var(--bg-primary)",
                }}
              >
                <span
                  style={{
                    fontWeight: "600",
                    fontSize: "0.875rem",
                    color: "var(--text-primary)",
                    cursor:
                      message.personaId === "AIGORA_INTERNAL_USER"
                        ? "default"
                        : "pointer",
                    textDecoration:
                      message.personaId === "AIGORA_INTERNAL_USER"
                        ? "none"
                        : "underline",
                    textDecorationColor: "transparent",
                    transition: "text-decoration-color 0.2s ease",
                  }}
                  onClick={() => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      const persona = personas.find(
                        (p) => p.personaId === message.personaId
                      )
                      if (persona) {
                        setSelectedPersona(persona)
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      e.currentTarget.style.textDecorationColor =
                        "var(--text-primary)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (message.personaId !== "AIGORA_INTERNAL_USER") {
                      e.currentTarget.style.textDecorationColor = "transparent"
                    }
                  }}
                >
                  {getPersonaName(message.personaId)}
                </span>
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: isUserMessage
                      ? "var(--text-secondary)"
                      : "var(--text-muted)",
                    fontFamily: "monospace",
                  }}
                >
                  #
                  {message.personaId === "AIGORA_INTERNAL_USER"
                    ? "AIGORA_INTERNAL_USER"
                    : message.personaId.slice(-6)}
                </span>
                {message.privateThoughts && (
                  <button
                    onClick={() => toggleSecretThoughts(index)}
                    style={{
                      marginLeft: "auto",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      padding: "0.25rem",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    🧠 {isExpanded ? "▲" : "▼"}
                  </button>
                )}
              </div>

              {/* Secret thoughts section (accordion) */}
              {message.privateThoughts && isExpanded && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    backgroundColor: "var(--bg-tertiary)",
                    borderBottom: "1px solid var(--border)",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                    fontStyle: "italic",
                    lineHeight: "1.4",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "0.5rem",
                      fontWeight: "600",
                      color: "var(--text-muted)",
                    }}
                  >
                    Private thoughts:
                  </div>
                  {message.privateThoughts}
                </div>
              )}

              {/* Public response */}
              <div
                style={{
                  padding: "0.75rem 1rem",
                  lineHeight: "1.4",
                }}
              >
                {message.messageText}
              </div>
            </div>
          </div>
        </div>
      )
    }

    return null
  }

  return (
    <div style={{ paddingBottom: isFinished ? "2rem" : "200px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          Topic
        </h1>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: "1rem",
          }}
        >
          {thread.topic}
        </h2>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Chat
            </h2>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                color: "var(--text-secondary)",
                fontSize: "0.75rem",
              }}
            >
              <span>ID: {thread.threadId}</span>
              <span>•</span>
              <span>{thread.personas.length} personas</span>
              <span>•</span>
              <span>{thread.stream.length} events</span>
              <span>•</span>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: isFinished
                      ? "var(--warning)"
                      : isActive
                      ? "var(--accent)"
                      : "var(--text-muted)",
                  }}
                />
                <span>
                  {isFinished ? "Finished" : isActive ? "Active" : "Paused"}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setViewMode("chat")}
              style={{
                backgroundColor:
                  viewMode === "chat" ? "var(--accent)" : "var(--bg-tertiary)",
                color: viewMode === "chat" ? "white" : "var(--text-secondary)",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Chat
            </button>
            <button
              onClick={() => setViewMode("json")}
              style={{
                backgroundColor:
                  viewMode === "json" ? "var(--accent)" : "var(--bg-tertiary)",
                color: viewMode === "json" ? "white" : "var(--text-secondary)",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              JSON
            </button>
          </div>
        </div>

        {viewMode === "chat" ? (
          <div
            style={{
              backgroundColor: "var(--bg-tertiary)",
              padding: "1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              overflow: "auto",
              maxHeight: "600px",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            {processStreamEvents().map((message, index) =>
              renderChatMessage(message, index)
            )}
          </div>
        ) : (
          <pre
            style={{
              backgroundColor: "var(--bg-tertiary)",
              padding: "1.5rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              lineHeight: 1.5,
              overflow: "auto",
              maxHeight: "600px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {JSON.stringify(thread.stream, null, 2)}
          </pre>
        )}
      </div>

      {/* Controls Footer - Hidden when thread is finished */}
      {!isFinished && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "var(--bg-secondary)",
            borderTop: "1px solid var(--border)",
            padding: "1rem 0",
            zIndex: 100,
          }}
        >
          <div className="container">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <button
                onClick={handlePause}
                disabled={isOperating || !isActive || isFinished}
                style={{
                  backgroundColor:
                    isActive && !isFinished
                      ? "var(--warning)"
                      : "var(--bg-tertiary)",
                  color:
                    isActive && !isFinished ? "black" : "var(--text-muted)",
                  minWidth: "80px",
                }}
              >
                {isOperating ? "..." : "⏸️ Pause"}
              </button>

              <button
                onClick={handleResume}
                disabled={isOperating || isActive || isFinished}
                className="primary"
                style={{
                  backgroundColor:
                    isPaused && !isFinished
                      ? "var(--accent)"
                      : "var(--bg-tertiary)",
                  minWidth: "80px",
                }}
              >
                {isOperating ? "..." : "▶️ Resume"}
              </button>

              <form
                onSubmit={handleSpeak}
                style={{
                  display: "flex",
                  flex: 1,
                  gap: "0.5rem",
                  alignItems: "flex-end",
                }}
              >
                <div
                  style={{ display: "flex", flexDirection: "column", flex: 1 }}
                >
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      isActive
                        ? "Pause thread to add notes"
                        : "Private notes (optional)"
                    }
                    disabled={isActive}
                    style={{
                      marginBottom: "0.5rem",
                      fontSize: "0.75rem",
                      padding: "0.5rem",
                      opacity: isActive ? 0.5 : 1,
                    }}
                  />
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      isActive
                        ? "Pause thread to participate"
                        : "Type your message..."
                    }
                    required
                    disabled={isActive}
                    style={{
                      flex: 1,
                      opacity: isActive ? 0.5 : 1,
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isOperating || !message.trim() || isActive}
                  className="primary"
                  style={{
                    opacity: isActive ? 0.5 : 1,
                  }}
                >
                  {isOperating ? "..." : "Send"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedPersona && (
        <PersonaModal
          persona={selectedPersona}
          onClose={() => setSelectedPersona(null)}
        />
      )}
    </div>
  )
}
