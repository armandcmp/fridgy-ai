interface Props {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

const PALETTE = [
  "#4CAF82",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#10B981",
];

export function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % PALETTE.length;
  return PALETTE[hash];
}

export function Avatar({ name, color, size = 36, className = "" }: Props) {
  const initials = name
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const bg = color || colorFor(name);
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initials || "?"}
    </div>
  );
}

export { PALETTE };
