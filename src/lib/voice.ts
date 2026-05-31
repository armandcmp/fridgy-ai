/* eslint-disable @typescript-eslint/no-explicit-any */
export function isSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );
}

export function startVoiceRecognition(
  onResult: (transcript: string) => void,
  onError: (err: string) => void,
): any | null {
  if (typeof window === "undefined") return null;
  const SR =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    onError("non_supporté");
    return null;
  }
  const recognition = new SR();
  recognition.lang = "fr-FR";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onresult = (event: any) => {
    onResult(event.results[0][0].transcript);
  };
  recognition.onerror = (event: any) => onError(event.error);
  recognition.start();
  return recognition;
}
