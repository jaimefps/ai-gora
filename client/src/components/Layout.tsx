import React from "react"
import { Breadcrumb } from "./Breadcrumb"
import type { BreadcrumbItem } from "./Breadcrumb"

interface LayoutProps {
  children: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  title?: string
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  breadcrumbs,
  title,
}) => {
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Always render navigation bar for consistent height */}
      <nav
        style={{
          padding: "calc(1rem + 1px) 3px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "2rem",
          minHeight: "3rem", // Fixed height for consistency
        }}
      >
        <div className="container">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumb items={breadcrumbs} />
          ) : (
            // Empty space to maintain consistent height
            <div style={{ height: "1.25rem" }} />
          )}
        </div>
      </nav>
      <main className="container">
        {title && (
          <h1
            style={{
              fontSize: "2rem",
              marginBottom: "2rem",
              fontWeight: 600,
            }}
          >
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  )
}
