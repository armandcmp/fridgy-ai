import { getAvatarColor, initials } from "@/lib/auth";

export function Avatar({
  name,
  id,
  size = 44,
  color,
  photo,
}: {
  name: string;
  id: string;
  size?: number;
  color?: string;
  photo?: string;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: color ?? getAvatarColor(id),
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: Math.round(size * 0.4),
        letterSpacing: 0.5,
        flexShrink: 0,
      }}
    >
      {initials(name)}
    </div>
  );
}
