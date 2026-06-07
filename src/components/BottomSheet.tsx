import { useEffect, type ReactNode } from "react";

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md animate-fade-up bg-card"
        style={{
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 40,
            height: 4,
            background: "#E0E0E0",
            borderRadius: 2,
            margin: "10px auto 16px",
          }}
        />
        {title && (
          <h3 className="mb-3 px-5 text-base font-semibold">{title}</h3>
        )}
        <div className="px-5">{children}</div>
      </div>
    </div>
  );
}
