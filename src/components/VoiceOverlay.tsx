import { useEffect, useRef, useState } from "react";
import { Mic, X } from "lucide-react";
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
  | "ask_permission"
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

const isIOS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

export function VoiceOverlay({ open, onClose, onTranscript, onFallback }: VoiceOverlayProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("checking");
  const [interim, setInterim] = useState("");
  const [rawTranscript, setRawTranscript] = useState("");
  const mgrRef = useRef<VoiceRecognitionManager | null>(null);

  useEffect(() => {
    if (!open) {
      mgrRef.current?.abort();
      mgrRef.current = null;
      setInterim("");
      setRawTranscript("");
      setPhase("checking");
      return;
    }
    bootstrap();
    return () => {
      mgrRef.current?.abort();
      mgrRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      // Auto-request mic; no extra confirmation step.
      const ok = await requestMicAccess();
      if (!ok) {
        setPhase("denied");
        return;
      }
    }
    startListening();
  }

  function startListening() {
    setInterim("");
    setRawTranscript("");
    setPhase("listening");
    const mgr = new VoiceRecognitionManager({
      onState: (s, payload) => {
        if (s === "listening") setPhase("listening");
        else if (s === "interim" && payload) setInterim(payload);
        else if (s === "processing") setPhase("processing");
      },
      onResult: async (transcript) => {
        setRawTranscript(transcript);
        setPhase("processing");
        try {
          await onTranscript(transcript);
          setPhase("done");
          setTimeout(onClose, 400);
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
    mgr.start();
  }

  async function handleAskPermission() {
    const ok = await requestMicAccess();
    if (!ok) {
      setPhase("denied");
      return;
    }
    startListening();
  }

  function stopAndProcess() {
    mgrRef.current?.stop();
  }

  if (!open) return null;

  const circleBg =
    phase === "processing"
      ? "#EF4444"
      : phase === "error_no_speech" || phase === "error_network" || phase === "error_api"
        ? "#F59E0B"
        : phase === "denied" || phase === "unsupported"
          ? "#EF4444"
          : "#4CAF82";

  const showPulse = phase === "listening";

  const statusText =
    phase === "listening"
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
                    : t("voice.askTitle");

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 text-white"
      style={{ background: "rgba(26,26,26,0.95)", animation: "fadeIn 200ms ease-out" }}
    >
      <button
        onClick={onClose}
        aria-label={t("voice.cancel")}
        className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full"
        style={{ background: "rgba(255,255,255,0.1)" }}
      >
        <X size={20} />
      </button>

      <div
        className={`grid place-items-center ${showPulse ? "animate-pulse-ring" : ""}`}
        style={{
          width: 120,
          height: 120,
          borderRadius: 60,
          background: circleBg,
          transition: "background 200ms ease",
        }}
      >
        <Mic size={48} color="#fff" />
      </div>

      <div className="mt-6 text-center text-lg font-semibold">{statusText}</div>

      {(phase === "listening" || phase === "ask_permission") && (
        <p className="mt-3 max-w-xs text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          {phase === "ask_permission" ? t("voice.askSub") : t("voice.hint")}
        </p>
      )}

      {phase === "listening" && interim && (
        <p className="mt-3 max-w-xs text-center text-sm italic" style={{ color: "rgba(255,255,255,0.9)" }}>
          « {interim} »
        </p>
      )}

      {phase === "listening" && isIOS && (
        <p className="mt-2 text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("voice.iosHint")}
        </p>
      )}

      {/* Actions per phase */}
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        {phase === "ask_permission" && (
          <button
            onClick={handleAskPermission}
            className="rounded-full bg-white py-3 text-sm font-semibold text-black"
          >
            {t("voice.askCta")}
          </button>
        )}

        {phase === "listening" && (
          <button
            onClick={stopAndProcess}
            className="rounded-full border border-white py-3 text-sm font-semibold text-white"
          >
            {t("voice.stop")}
          </button>
        )}

        {(phase === "error_no_speech" || phase === "error_network") && (
          <>
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {phase === "error_no_speech" ? t("voice.noSpeechSub") : t("voice.networkSub")}
            </p>
            <button
              onClick={startListening}
              className="rounded-full bg-white py-3 text-sm font-semibold text-black"
            >
              {t("voice.retry")}
            </button>
            <button
              onClick={() => onFallback("manual")}
              className="rounded-full border border-white py-3 text-sm font-semibold text-white"
            >
              {t("voice.useManual")}
            </button>
          </>
        )}

        {phase === "error_api" && (
          <>
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("voice.apiSub")}
            </p>
            {rawTranscript && (
              <div
                className="rounded-lg p-3 text-sm"
                style={{ background: "rgba(255,255,255,0.1)" }}
              >
                « {rawTranscript} »
              </div>
            )}
            <button
              onClick={async () => {
                const parts = rawTranscript
                  .split(/[,;]| et | puis /i)
                  .map((s) => s.trim())
                  .filter(Boolean);
                await onTranscript(parts.join(", "));
                onClose();
              }}
              className="rounded-full bg-white py-3 text-sm font-semibold text-black"
            >
              {t("voice.useAnyway")}
            </button>
          </>
        )}

        {phase === "denied" && (
          <>
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("voice.deniedSub")}
            </p>
            <button
              onClick={() => onFallback("photo")}
              className="rounded-full bg-white py-3 text-sm font-semibold text-black"
            >
              {t("voice.usePhoto")}
            </button>
            <button
              onClick={() => onFallback("manual")}
              className="rounded-full border border-white py-3 text-sm font-semibold text-white"
            >
              {t("voice.useManual")}
            </button>
          </>
        )}

        {phase === "unsupported" && (
          <>
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
              {t("voice.unsupportedSub")}
            </p>
            <button
              onClick={() => onFallback("photo")}
              className="rounded-full bg-white py-3 text-sm font-semibold text-black"
            >
              {t("voice.usePhoto")}
            </button>
            <button
              onClick={() => onFallback("manual")}
              className="rounded-full border border-white py-3 text-sm font-semibold text-white"
            >
              {t("voice.useManual")}
            </button>
          </>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute bottom-8 text-sm"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        {t("voice.cancel")}
      </button>
    </div>
  );
}
