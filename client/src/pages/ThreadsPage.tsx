import React, { useState, useEffect } from "react"
import { api } from "../api"
import type { Thread } from "../types"
import type { Page } from "../App"
import { CreateThreadModal } from "../components/CreateThreadModal"
import { CreatePersonaModal } from "../components/CreatePersonaModal"
import { router } from "../router"

interface ThreadsPageProps {
  onNavigate: (page: Page, params?: Record<string, string>) => void
}

export const ThreadsPage: React.FC<ThreadsPageProps> = ({ onNavigate }) => {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreatePersonaModal, setShowCreatePersonaModal] = useState(false)

  useEffect(() => {
    loadThreads()
  }, [])

  // Polling effect for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadThreads(false)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const loadThreads = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const data = await api.getThreads()
      setThreads(data)
    } catch (error) {
      console.error("Failed to load threads:", error)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleCreateThread = async (thread: {
    topic: string
    personas: string[]
  }) => {
    try {
      const result = await api.createThread(thread)
      setShowCreateModal(false)
      // Navigate to the new thread
      onNavigate("thread-detail", { threadId: result.threadId })
    } catch (error) {
      console.error("Failed to create thread:", error)
    }
  }

  const handleCreatePersona = async (persona: {
    name: string
    sys: string
  }) => {
    try {
      await api.createPersona(persona)
      setShowCreatePersonaModal(false)
      // Navigate to personas page
      router.navigate("personas")
    } catch (error) {
      console.error("Failed to create persona:", error)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div style={{ color: "var(--text-secondary)" }}>Loading threads...</div>
      </div>
    )
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>Threads</h1>
        </div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button className="primary" onClick={() => setShowCreateModal(true)}>
            Create Thread
          </button>
          <button
            className="secondary"
            onClick={() => setShowCreatePersonaModal(true)}
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              borderColor: "var(--border)",
              backgroundColor: "transparent",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"
              e.currentTarget.style.borderColor = "var(--text-muted)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.borderColor = "var(--border)"
            }}
          >
            Create Persona
          </button>
          <button
            className="secondary"
            onClick={() => router.navigate("personas")}
            style={{
              fontSize: "0.875rem",
              color: "var(--text-secondary)",
              borderColor: "var(--border)",
              backgroundColor: "transparent",
              transition: "background-color 0.2s ease, border-color 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"
              e.currentTarget.style.borderColor = "var(--text-muted)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
              e.currentTarget.style.borderColor = "var(--border)"
            }}
          >
            View Personas →
          </button>
        </div>
      </div>

      {threads.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            color: "var(--text-secondary)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💬</div>
          <h3 style={{ marginBottom: "1rem" }}>No threads yet</h3>
          <p>
            Create your first discussion thread to start a debate between
            personas.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {threads.map((thread) => (
            <div
              key={thread.threadId}
              className="card clickable"
              onClick={() =>
                onNavigate("thread-detail", { threadId: thread.threadId })
              }
            >
              <p
                style={{
                  color: "var(--text-primary)",
                  // fontSize: '1.25rem',
                  fontWeight: 600,
                  marginTop: "0.4rem",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
                title={thread.topic}
              >
                {thread.topic.substring(0, 150)}
                {thread.topic.length > 150 ? "..." : ""}
              </p>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                ID: {thread.threadId}
              </p>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                }}
              >
                {thread.personas.length} personas • {thread.stream.length}{" "}
                events
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                {(() => {
                  // Check if thread is finished (everyone voted)
                  const voteCount = thread.stream.filter(
                    (event) => event.type === "VoteSchema"
                  ).length
                  const isFinished = voteCount >= thread.personas.length

                  // Check if thread is paused
                  const findLastMarkerIndex = (markerType: string) => {
                    for (let i = thread.stream.length - 1; i >= 0; i--) {
                      if (thread.stream[i].type === markerType) return i
                    }
                    return -1
                  }
                  const lastPauseIndex = findLastMarkerIndex("PauseMarker")
                  const lastResumeIndex = findLastMarkerIndex("ResumeMarker")
                  const isPaused =
                    lastPauseIndex !== -1 && lastPauseIndex > lastResumeIndex

                  const status = isFinished
                    ? "Finished"
                    : isPaused
                    ? "Paused"
                    : "Active"
                  const color = isFinished
                    ? "var(--warning)"
                    : isPaused
                    ? "var(--text-muted)"
                    : "var(--accent)"

                  return (
                    <>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor: color,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.875rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {status}
                      </span>
                    </>
                  )
                })()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateThreadModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateThread}
        />
      )}

      {showCreatePersonaModal && (
        <CreatePersonaModal
          onClose={() => setShowCreatePersonaModal(false)}
          onCreate={handleCreatePersona}
        />
      )}
    </div>
  )
}
