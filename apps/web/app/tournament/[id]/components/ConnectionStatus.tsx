interface ConnectionStatusProps {
  connected: boolean;
  lastUpdate?: string;
}

export function ConnectionStatus({ connected, lastUpdate }: ConnectionStatusProps) {
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

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span
          className={`
            h-2 w-2 rounded-full
            ${connected ? "bg-padel-connected animate-pulse-soft" : "bg-padel-disconnected"}
          `}
        />
        <span className="text-padel-muted">{connected ? "Live" : "Disconnected"}</span>
      </div>
      {lastUpdate && (
        <>
          <span className="text-padel-border">•</span>
          <span className="text-padel-muted">Updated {getRelativeTime(lastUpdate)}</span>
        </>
      )}
    </div>
  );
}
