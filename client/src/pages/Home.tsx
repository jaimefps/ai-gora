import React from "react"
import type { Page } from "../App"

interface HomeProps {
  onNavigate: (page: Page, params?: Record<string, string>) => void
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  return (
    <div>
      <div
        style={{
          textAlign: "center",
          marginBottom: "3rem",
        }}
      >
        <h1
          style={{
            fontSize: "3rem",
            marginBottom: "1rem",
            fontWeight: 700,
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          A(i)gora
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "var(--text-secondary)",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          Let AI personas debate and discuss any topic. Create intelligent
          conversations between different perspectives and viewpoints.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          className="card clickable"
          onClick={() => onNavigate("personas")}
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              color: "var(--accent)",
            }}
          >
            👤
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Personas
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Create and manage AI personas with unique personalities, viewpoints,
            and debate styles.
          </p>
        </div>

        <div
          className="card clickable"
          onClick={() => onNavigate("threads")}
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              color: "var(--accent)",
            }}
          >
            💬
          </div>
          <h2
            style={{
              fontSize: "1.5rem",
              marginBottom: "1rem",
              fontWeight: 600,
            }}
          >
            Threads
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              lineHeight: 1.6,
            }}
          >
            Start discussions between personas on any topic. Watch debates
            unfold and participate in the conversation.
          </p>
        </div>
      </div>
    </div>
  )
}
