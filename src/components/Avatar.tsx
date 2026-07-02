export function Avatar({
  name,
  size = 44,
  photo,
}: {
  name?: string;
  id?: string;
  size?: number;
  color?: string;
  photo?: string;
}) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name ?? ""}
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
  const iconSize = Math.round(size * 0.62);
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: "#E5E7EB",
        color: "#9CA3AF",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 12.5c2.485 0 4.5-2.015 4.5-4.5S14.485 3.5 12 3.5 7.5 5.515 7.5 8s2.015 4.5 4.5 4.5Zm0 2c-3.314 0-8 1.657-8 4.75V21h16v-1.75c0-3.093-4.686-4.75-8-4.75Z" />
      </svg>
    </div>
  );
}
