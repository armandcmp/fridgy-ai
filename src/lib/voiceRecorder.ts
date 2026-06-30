/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Audio capture → 16 kHz mono WAV. Works on all browsers (Chrome, Safari iOS/macOS, Firefox, Android).

export class WavRecorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Float32Array[] = [];
  private sampleRate = 44100;
  private running = false;

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.sampleRate = this.ctx.sampleRate;
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.processor = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.processor.onaudioprocess = (e) => {
      if (!this.running) return;
      const ch = e.inputBuffer.getChannelData(0);
      this.chunks.push(new Float32Array(ch));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.ctx.destination);
    this.running = true;
  }

  async stop(): Promise<Blob> {
    this.running = false;
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      this.stream?.getTracks().forEach((t) => t.stop());
    } catch {
      /* */
    }
    const merged = mergeChunks(this.chunks);
    const downsampled = downsampleBuffer(merged, this.sampleRate, 16000);
    try {
      await this.ctx?.close();
    } catch {
      /* */
    }
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.chunks = [];
    return encodeWav(downsampled, 16000);
  }

  abort(): void {
    this.running = false;
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
      this.stream?.getTracks().forEach((t) => t.stop());
      this.ctx?.close();
    } catch {
      /* */
    }
    this.ctx = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.chunks = [];
  }
}

function mergeChunks(chunks: Float32Array[]): Float32Array {
  let len = 0;
  for (const c of chunks) len += c.length;
  const out = new Float32Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function downsampleBuffer(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (toRate === fromRate) return buffer;
  const ratio = fromRate / toRate;
  const newLen = Math.round(buffer.length / ratio);
  const out = new Float32Array(newLen);
  let pos = 0;
  let i = 0;
  while (pos < newLen) {
    const next = Math.round((pos + 1) * ratio);
    let sum = 0;
    let count = 0;
    for (; i < next && i < buffer.length; i++) {
      sum += buffer[i];
      count++;
    }
    out[pos] = count > 0 ? sum / count : 0;
    pos++;
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  // RIFF
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, s: string) {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}
