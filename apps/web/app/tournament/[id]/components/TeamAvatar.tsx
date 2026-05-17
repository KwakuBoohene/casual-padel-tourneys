interface TeamAvatarProps {
  players: Array<{ id: string; name: string }>;
  size?: "sm" | "md" | "lg";
}

const AVATAR_GRADIENTS = [
  "from-purple-500 to-pink-500",
  "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500",
  "from-orange-500 to-red-500",
  "from-yellow-500 to-amber-500",
  "from-indigo-500 to-purple-500",
  "from-teal-500 to-green-500",
  "from-rose-500 to-pink-500"
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradientForId(id: string): string {
  // Simple hash function for deterministic color assignment
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

export function TeamAvatar({ players, size = "md" }: TeamAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[10px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-sm"
  };

  const offsetClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4"
  };

  return (
    <div className="flex items-center">
      {players.map((player, index) => (
        <div
          key={player.id}
          className={`
            ${sizeClasses[size]}
            ${index > 0 ? offsetClasses[size] : ""}
            rounded-full
            bg-gradient-to-br ${getGradientForId(player.id)}
            border-2 border-padel-surface
            flex items-center justify-center
            font-bold text-white
            shadow-lg
            relative
          `}
          style={{ zIndex: players.length - index }}
          title={player.name}
        >
          {getInitials(player.name)}
        </div>
      ))}
    </div>
  );
}
