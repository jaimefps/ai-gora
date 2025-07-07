import { useState, useEffect } from "react"
import { Layout } from "./components/Layout"
import type { BreadcrumbItem } from "./components/Breadcrumb"
import { Home } from "./pages/Home"
import { PersonasPage } from "./pages/PersonasPage"
import { ThreadsPage } from "./pages/ThreadsPage"
import { ThreadDetailPage } from "./pages/ThreadDetailPage"
import { router } from "./router"
import type { Route } from "./router"
import "./App.css"

export type Page = "home" | "personas" | "threads" | "thread-detail"

function App() {
  const [currentRoute, setCurrentRoute] = useState<Route>(
    router.getCurrentRoute()
  )

  useEffect(() => {
    const unsubscribe = router.subscribe((route) => {
      setCurrentRoute(route)
    })

    return unsubscribe
  }, [])

  const navigate = (page: Page, params?: Record<string, string>) => {
    router.navigate(page, params)
  }

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", onClick: () => navigate("home") },
    ]

    switch (currentRoute.page) {
      case "personas": {
        breadcrumbs.push({ label: "Personas" })
        break
      }
      case "threads": {
        breadcrumbs.push({ label: "Threads" })
        break
      }
      case "thread-detail": {
        breadcrumbs.push(
          { label: "Threads", onClick: () => navigate("threads") },
          { label: `Thread ${currentRoute.params?.threadId}` }
        )
        break
      }
    }

    return breadcrumbs
  }

  const renderPage = () => {
    switch (currentRoute.page) {
      case "home":
        return <Home onNavigate={navigate} />
      case "personas":
        return <PersonasPage />
      case "threads":
        return <ThreadsPage onNavigate={navigate} />
      case "thread-detail": {
        const threadId = currentRoute.params?.threadId
        if (!threadId) {
          navigate("threads")
          return null
        }
        return <ThreadDetailPage threadId={threadId} />
      }
      default:
        return <Home onNavigate={navigate} />
    }
  }

  return <Layout breadcrumbs={getBreadcrumbs()}>{renderPage()}</Layout>
}

export default App
