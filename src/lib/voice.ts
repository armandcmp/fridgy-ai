/* eslint-disable @typescript-eslint/no-explicit-any */
// Cross-browser voice recognition backed by server-side Lovable AI transcription.
// Works on Chrome/Firefox/Safari (macOS+iOS)/Android — anywhere getUserMedia is allowed.
import { getLanguage } from "./i18n";
import { WavRecorder } from "./voiceRecorder";

export type VoiceState = "idle" | "listening" | "interim" | "processing" | "done" | "error";
export type VoiceErrorKind =
  | "not_supported"
  | "permission_denied"
  | "no_speech"
  | "network"
  | "aborted"
  | "start_failed"
  | "unknown";

const ISO3: Record<string, string> = {
  fr: "fra",
  en: "eng",
  es: "spa",
  pt: "por",
  zh: "zho",
};

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window as any).AudioContext);
}

export async function checkMicPermission(): Promise<"granted" | "denied" | "prompt"> {
  if (typeof navigator === "undefined" || !(navigator as any).permissions) return "prompt";
  try {
    const r = await (navigator as any).permissions.query({ name: "microphone" as PermissionName });
    return r.state as "granted" | "denied" | "prompt";
  } catch {
    return "prompt";
  }
}

export async function requestMicAccess(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

export interface VoiceCallbacks {
  onState: (s: VoiceState, payload?: string) => void;
  onResult: (transcript: string) => void;
  onError: (kind: VoiceErrorKind) => void;
}

export class VoiceRecognitionManager {
  private recorder: WavRecorder | null = null;
  private aborted = false;

  constructor(private cb: VoiceCallbacks) {}

  isSupported() {
    return isSpeechSupported();
  }

  async start() {
    if (!this.isSupported()) {
      this.cb.onError("not_supported");
      return;
    }
    this.aborted = false;
    this.recorder = new WavRecorder();
    try {
      await this.recorder.start();
      this.cb.onState("listening");
    } catch (e: any) {
      const name = e?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") this.cb.onError("permission_denied");
      else this.cb.onError("start_failed");
    }
  }

  async stop() {
    if (!this.recorder) return;
    if (this.aborted) return;
    const rec = this.recorder;
    this.recorder = null;
    let blob: Blob;
    try {
      blob = await rec.stop();
    } catch {
      this.cb.onError("unknown");
      return;
    }
    if (blob.size < 2048) {
      this.cb.onError("no_speech");
      return;
    }
    this.cb.onState("processing");
    try {
      const form = new FormData();
      form.append("file", blob, "recording.wav");
      const lang = ISO3[getLanguage()];
      if (lang) form.append("language", lang);
      const resp = await fetch("/api/transcribe", { method: "POST", body: form });
      if (!resp.ok) {
        this.cb.onError(resp.status >= 500 ? "network" : "unknown");
        return;
      }
      const json = await resp.json();
      const text = (json?.text || "").trim();
      if (!text) {
        this.cb.onError("no_speech");
        return;
      }
      this.cb.onResult(text);
    } catch {
      this.cb.onError("network");
    }
  }

  abort() {
    this.aborted = true;
    try {
      this.recorder?.abort();
    } catch {
      /* */
    }
    this.recorder = null;
  }
}

export function startVoiceRecognition(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
) {
  const mgr = new VoiceRecognitionManager({
    onState: () => {},
    onResult,
    onError: (k) => onError(k),
  });
  mgr.start();
  return { stop: () => mgr.stop() };
}
