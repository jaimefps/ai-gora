import React from "react"
import type { Persona, Thread } from "../types"
import { router } from "../router"

interface PersonaModalProps {
  persona: Persona
  threads: Thread[]
  onClose: () => void
}

export const PersonaModal: React.FC<PersonaModalProps> = ({
  persona,
  threads,
  onClose,
}) => {
  const personaThreads = threads.filter((thread) =>
    thread.personas.includes(persona.personaId)
  )
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            Persona Details
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "1.5rem",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Name
          </label>
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            {persona.name}
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Persona ID
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "0.875rem",
                  fontFamily: "monospace",
                }}
              >
                {persona.personaId}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                Provider
              </label>
              <div
                style={{
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-tertiary)",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  fontSize: "0.875rem",
                  textTransform: "capitalize",
                }}
              >
                {persona.provider}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            System Prompt
          </label>
          <div
            style={{
              padding: "1rem",
              backgroundColor: "var(--bg-tertiary)",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              maxHeight: "300px",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {persona.sys}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Conversations ({personaThreads.length})
          </label>
          {personaThreads.length === 0 ? (
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "0.875rem",
                color: "var(--text-secondary)",
                textAlign: "center",
              }}
            >
              This persona hasn't participated in any conversations yet.
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "var(--bg-tertiary)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              {personaThreads.map((thread, index) => (
                <div
                  key={thread.threadId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    borderBottom:
                      index < personaThreads.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                  onClick={() => {
                    router.navigate("thread-detail", {
                      threadId: thread.threadId,
                    })
                    onClose()
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--bg-secondary)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        color: "var(--text-primary)",
                        marginBottom: "0.25rem",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {thread.topic}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        fontFamily: "monospace",
                      }}
                    >
                      ID: {thread.threadId}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      marginLeft: "1rem",
                    }}
                  >
                    {thread.personas.length} persona
                    {thread.personas.length !== 1 ? "s" : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
