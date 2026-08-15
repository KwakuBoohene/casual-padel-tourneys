interface ConnectionStatusProps {
  connected: boolean;
  lastUpdate?: string;
  variant?: "inline" | "banner";
}

export function ConnectionStatus({
  connected,
  lastUpdate,
  variant = "inline"
}: ConnectionStatusProps) {
  const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "Never";

    const now = new Date();
    const past = new Date(dateString);
    const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (seconds < 10) return "Just now";
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (variant === "banner" && !connected) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-padel-danger/50 bg-padel-danger/10 px-4 py-3 text-sm text-padel-text"
      >
        <p className="font-semibold text-padel-danger">Connection lost</p>
        <p className="text-padel-muted mt-1">
          Scores may be stale{lastUpdate ? ` · last update ${getRelativeTime(lastUpdate)}` : ""}.
          Reconnecting…
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            connected ? "bg-padel-connected animate-pulse-soft" : "bg-padel-disconnected"
          }`}
        />
        <span className="text-padel-muted">{connected ? "Live" : "Disconnected"}</span>
      </div>
      {lastUpdate ? (
        <>
          <span className="text-padel-border">·</span>
          <span className="text-padel-muted">Updated {getRelativeTime(lastUpdate)}</span>
        </>
      ) : null}
    </div>
  );
}
