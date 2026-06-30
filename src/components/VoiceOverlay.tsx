import { useEffect, useRef, useState } from "react";
import { Mic, X, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  VoiceRecognitionManager,
  checkMicPermission,
  requestMicAccess,
  isSpeechSupported,
  type VoiceErrorKind,
} from "@/lib/voice";

type Phase =
  | "checking"
  | "denied"
  | "unsupported"
  | "listening"
  | "processing"
  | "error_no_speech"
  | "error_network"
  | "error_api"
  | "done";

export interface VoiceOverlayProps {
  open: boolean;
  onClose: () => void;
  onTranscript: (transcript: string) => Promise<void> | void;
  onFallback: (mode: "photo" | "manual") => void;
}

export function VoiceOverlay({ open, onClose, onTranscript, onFallback }: VoiceOverlayProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("checking");
  const [elapsed, setElapsed] = useState(0);
  const mgrRef = useRef<VoiceRecognitionManager | null>(null);
  const startTsRef = useRef<number>(0);

  useEffect(() => {
    if (!open) {
      mgrRef.current?.abort();
      mgrRef.current = null;
      setPhase("checking");
      setElapsed(0);
      return;
    }
    void bootstrap();
    return () => {
      mgrRef.current?.abort();
      mgrRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // elapsed timer
  useEffect(() => {
    if (phase !== "listening") return;
    startTsRef.current = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTsRef.current) / 1000)), 250);
    return () => clearInterval(id);
  }, [phase]);

  async function bootstrap() {
    if (!isSpeechSupported()) {
      setPhase("unsupported");
      return;
    }
    const perm = await checkMicPermission();
    if (perm === "denied") {
      setPhase("denied");
      return;
    }
    if (perm === "prompt") {
      const ok = await requestMicAccess();
      if (!ok) {
        setPhase("denied");
        return;
      }
    }
    startListening();
  }

  function startListening() {
    setPhase("listening");
    setElapsed(0);
    const mgr = new VoiceRecognitionManager({
      onState: (s) => {
        if (s === "listening") setPhase("listening");
        else if (s === "processing") setPhase("processing");
      },
      onResult: async (transcript) => {
        setPhase("processing");
        try {
          await onTranscript(transcript);
          setPhase("done");
          setTimeout(onClose, 450);
        } catch {
          setPhase("error_api");
        }
      },
      onError: (kind: VoiceErrorKind) => {
        if (kind === "permission_denied") setPhase("denied");
        else if (kind === "no_speech") setPhase("error_no_speech");
        else if (kind === "network") setPhase("error_network");
        else if (kind === "not_supported") setPhase("unsupported");
        else setPhase("error_no_speech");
      },
    });
    mgrRef.current = mgr;
    void mgr.start();
  }

  function stopAndProcess() {
    void mgrRef.current?.stop();
  }

  if (!open) return null;

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(1, "0")}:${String(s % 60).padStart(2, "0")}`;

  const isError = phase === "error_no_speech" || phase === "error_network" || phase === "error_api" || phase === "denied" || phase === "unsupported";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={{ background: "rgba(15,27,23,0.35)", backdropFilter: "blur(4px)", animation: "fadeIn 160ms ease-out" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-3 mb-3 w-full max-w-sm overflow-hidden bg-white shadow-2xl sm:mb-0"
        style={{
          borderRadius: 24,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)",
          animation: "slideUp 220ms cubic-bezier(0.2,0.8,0.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-[13px] font-semibold" style={{ color: "#5A6B62" }}>
            {phase === "listening"
              ? t("voice.speak")
              : phase === "processing"
                ? t("voice.processing")
                : phase === "done"
                  ? t("voice.success")
                  : phase === "denied"
                    ? t("voice.deniedTitle")
                    : phase === "unsupported"
                      ? t("voice.unsupportedTitle")
                      : phase === "error_no_speech"
                        ? t("voice.noSpeechTitle")
                        : phase === "error_network"
                          ? t("voice.networkTitle")
                          : phase === "error_api"
                            ? t("voice.apiTitle")
                            : t("voice.processing")}
          </div>
          <button
            onClick={onClose}
            aria-label={t("voice.cancel")}
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
          >
            <X size={16} />
          </button>
        </div>

        {/* Main row */}
        <div className="flex items-center gap-4 px-5 pb-4 pt-3">
          {/* Mic / status circle */}
          <div className="relative grid place-items-center" style={{ width: 56, height: 56, flexShrink: 0 }}>
            {phase === "listening" && (
              <span
                className="absolute inset-0 rounded-full"
                style={{
                  background: "var(--primary)",
                  opacity: 0.18,
                  animation: "pingSoft 1.6s ease-out infinite",
                }}
              />
            )}
            <div
              className="grid place-items-center text-white"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: phase === "done"
                  ? "#22C55E"
                  : isError
                    ? "#EF4444"
                    : phase === "processing"
                      ? "#0F1B17"
                      : "var(--primary)",
                transition: "background 200ms ease",
                boxShadow: phase === "listening" ? "0 6px 18px rgba(45,212,168,0.45)" : "none",
              }}
            >
              {phase === "processing" ? (
                <Loader2 size={20} className="animate-spin" />
              ) : phase === "done" ? (
                <Check size={20} />
              ) : (
                <Mic size={20} />
              )}
            </div>
          </div>

          {/* Waveform / status */}
          <div className="min-w-0 flex-1">
            {phase === "listening" ? (
              <div className="flex h-7 items-center gap-[3px]">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 3,
                      borderRadius: 2,
                      background: "var(--primary)",
                      height: `${20 + ((i * 13) % 60)}%`,
                      animation: `bar 0.9s ease-in-out ${i * 60}ms infinite alternate`,
                    }}
                  />
                ))}
              </div>
            ) : phase === "processing" ? (
              <div className="text-[13px]" style={{ color: "#5A6B62" }}>{t("voice.processing")}…</div>
            ) : phase === "done" ? (
              <div className="text-[13px] font-medium" style={{ color: "#0F1B17" }}>{t("voice.success")}</div>
            ) : (
              <div className="text-[13px]" style={{ color: "#5A6B62" }}>
                {phase === "denied"
                  ? t("voice.deniedSub")
                  : phase === "unsupported"
                    ? t("voice.unsupportedSub")
                    : phase === "error_no_speech"
                      ? t("voice.noSpeechSub")
                      : phase === "error_network"
                        ? t("voice.networkSub")
                        : phase === "error_api"
                          ? t("voice.apiSub")
                          : ""}
              </div>
            )}
            {phase === "listening" && (
              <div className="mt-1 font-mono text-[11px]" style={{ color: "#7A8A85" }}>
                {fmt(elapsed)}
              </div>
            )}
          </div>

          {/* Stop / action button */}
          {phase === "listening" && (
            <button
              onClick={stopAndProcess}
              aria-label={t("voice.stop")}
              className="grid place-items-center rounded-full text-white transition active:scale-95"
              style={{ width: 44, height: 44, background: "#0F1B17", flexShrink: 0 }}
            >
              <span style={{ width: 12, height: 12, borderRadius: 3, background: "#fff" }} />
            </button>
          )}
        </div>

        {/* Error / fallback actions */}
        {(phase === "error_no_speech" || phase === "error_network" || phase === "error_api") && (
          <div className="flex gap-2 px-5 pb-1">
            <button
              onClick={startListening}
              className="flex-1 rounded-full bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground"
            >
              {t("voice.retry")}
            </button>
            <button
              onClick={() => onFallback("manual")}
              className="flex-1 rounded-full border border-input py-2.5 text-[13px] font-semibold"
              style={{ color: "#0F1B17" }}
            >
              {t("voice.useManual")}
            </button>
          </div>
        )}

        {(phase === "denied" || phase === "unsupported") && (
          <div className="flex gap-2 px-5 pb-1">
            <button
              onClick={() => onFallback("photo")}
              className="flex-1 rounded-full bg-primary py-2.5 text-[13px] font-semibold text-primary-foreground"
            >
              {t("voice.usePhoto")}
            </button>
            <button
              onClick={() => onFallback("manual")}
              className="flex-1 rounded-full border border-input py-2.5 text-[13px] font-semibold"
              style={{ color: "#0F1B17" }}
            >
              {t("voice.useManual")}
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pingSoft { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.6); opacity: 0; } }
        @keyframes bar { 0% { transform: scaleY(0.4); } 100% { transform: scaleY(1); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
