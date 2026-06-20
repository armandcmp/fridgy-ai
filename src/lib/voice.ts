/* eslint-disable @typescript-eslint/no-explicit-any */
import { getLanguage } from "./i18n";

export type VoiceState = "idle" | "listening" | "interim" | "processing" | "done" | "error";
export type VoiceErrorKind =
  | "not_supported"
  | "permission_denied"
  | "no_speech"
  | "network"
  | "aborted"
  | "start_failed"
  | "unknown";

const BCP47: Record<string, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
  pt: "pt-BR",
  zh: "zh-CN",
};

export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
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
  private recognition: any = null;
  private listening = false;
  private transcript = "";
  private stoppedByUser = false;

  constructor(private cb: VoiceCallbacks) {}

  isSupported() {
    return isSpeechSupported();
  }

  start() {
    if (!this.isSupported()) {
      this.cb.onError("not_supported");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r = new SR();
    this.recognition = r;
    this.transcript = "";
    this.stoppedByUser = false;
    r.lang = "fr-FR";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;

    r.onstart = () => {
      this.listening = true;
      this.cb.onState("listening");
    };
    r.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) final += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (interim) this.cb.onState("interim", interim);
      if (final) this.transcript += " " + final;
    };
    r.onerror = (event: any) => {
      const err = event.error as string;
      if (err === "aborted") return;
      if (err === "not-allowed" || err === "service-not-allowed") this.cb.onError("permission_denied");
      else if (err === "no-speech") this.cb.onError("no_speech");
      else if (err === "network") this.cb.onError("network");
      else this.cb.onError("unknown");
    };
    r.onend = () => {
      this.listening = false;
      const t = this.transcript.trim();
      if (t) {
        this.cb.onState("processing");
        this.cb.onResult(t);
      } else if (this.stoppedByUser) {
        this.cb.onError("no_speech");
      }
    };

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const delay = isIOS ? 200 : 0;
    setTimeout(() => {
      try {
        r.start();
      } catch {
        this.cb.onError("start_failed");
      }
    }, delay);
  }

  stop() {
    this.stoppedByUser = true;
    if (this.recognition && this.listening) {
      try {
        this.recognition.stop();
      } catch {
        /* */
      }
    }
  }

  abort() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        /* */
      }
    }
    this.listening = false;
  }
}

// Backwards-compat helper
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
