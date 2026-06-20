export function AchievementStamp({
  text,
  emoji,
  color = "var(--accent-coral)",
}: {
  text: string;
  emoji?: string;
  color?: string;
}) {
  return (
    <div
      className="animate-stamp-in inline-flex flex-col items-center justify-center text-white"
      style={{
        width: 96,
        height: 96,
        borderRadius: "50%",
        background: color,
        boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        border: "3px dashed rgba(255,255,255,0.55)",
        fontFamily: "Fredoka, system-ui, sans-serif",
        transform: "rotate(-8deg)",
      }}
    >
      {emoji && <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>}
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginTop: 4,
          textAlign: "center",
          padding: "0 8px",
          lineHeight: 1.1,
        }}
      >
        {text}
      </span>
    </div>
  );
}
