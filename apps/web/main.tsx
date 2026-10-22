import { Component, useEffect, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import RootLayout from "./app/layout";
import HomePage from "./app/page";
import TournamentPage from "./app/tournament/[id]/page";
import LeaderboardPage from "./app/tournament/[id]/leaderboard/page";
import KohRankingsPage from "./app/tournament/[id]/rankings/page";
import PublicCareerPage from "./app/c/[token]/page";
import NotFound from "./app/not-found";

class ViewerErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-4" role="alert">
          <p>Could not display the viewer. Please reload to try again.</p>
          <button
            className="min-h-12 px-5 rounded-xl border border-padel-border"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </main>
      );
    return this.props.children;
  }
}

function ViewerRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);
  // A different token must mount fresh live-view state and close the previous subscription.
  return (
    <ViewerErrorBoundary key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tournament/:id" element={<TournamentPage />} />
        <Route path="/tournament/:id/leaderboard" element={<LeaderboardPage />} />
        <Route path="/tournament/:id/rankings" element={<KohRankingsPage />} />
        <Route path="/c/:token" element={<PublicCareerPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ViewerErrorBoundary>
  );
}

async function bootstrap() {
  const response = await fetch("/runtime-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load viewer configuration. Please reload to try again.");
  window.__PADEL_CONFIG__ = await response.json();
  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <RootLayout>
        <ViewerRoutes />
      </RootLayout>
    </BrowserRouter>
  );
}
void bootstrap().catch((error: unknown) => {
  const root = document.getElementById("root")!;
  root.setAttribute("role", "alert");
  root.textContent = error instanceof Error ? error.message : "Could not start the viewer.";
});
