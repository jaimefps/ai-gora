import React from "react"

export interface BreadcrumbItem {
  label: string
  onClick?: () => void
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontSize: "0.875rem",
        color: "var(--text-secondary)",
      }}
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span>/</span>}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                padding: "1px 2px",
                fontSize: "inherit",
              }}
            >
              {item.label}
            </button>
          ) : (
            <span
              style={{
                color:
                  index === items.length - 1
                    ? "var(--text-primary)"
                    : "var(--accent)",
              }}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
