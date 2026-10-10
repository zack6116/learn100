type RecognitionResult = { transcript: string; isFinal: boolean };
type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> };
type Recognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => Recognizer) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => Recognizer;
    webkitSpeechRecognition?: new () => Recognizer;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function speechSynthesisAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function recognitionAvailable(): boolean {
  return getRecognitionCtor() !== null;
}

export function pickChineseVoice(): SpeechSynthesisVoice | null {
  if (!speechSynthesisAvailable()) return null;
  const voices = window.speechSynthesis.getVoices();
  const zh = voices.filter((voice) => /zh|cmn|chinese/i.test(voice.lang));
  return (
    zh.find((voice) => /female|女|tingting|ting-ting|xiaoxiao|xiaoyi|huihui|yaoyao|meijia/i.test(voice.name)) ??
    zh[0] ??
    null
  );
}

export function stopSpeaking() {
  if (!speechSynthesisAvailable()) return;
  window.speechSynthesis.cancel();
}

export function speakText(text: string, voice: SpeechSynthesisVoice | null): Promise<void> {
  if (!speechSynthesisAvailable()) return Promise.resolve();
  stopSpeaking();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.02;
    if (voice) utterance.voice = voice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function revealDelay(text: string): number {
  return Math.min(2600, 700 + text.length * 22);
}

export function createRecognizer(): Recognizer | null {
  const Ctor = getRecognitionCtor();
  if (!Ctor) return null;
  const recognizer = new Ctor();
  recognizer.lang = "zh-CN";
  recognizer.continuous = true;
  recognizer.interimResults = true;
  return recognizer;
}

export function readRecognition(event: RecognitionEvent): { finalText: string; interim: string } {
  let finalText = "";
  let interim = "";
  const results = event.results;
  for (let index = 0; index < results.length; index += 1) {
    const row = results[index] as ArrayLike<{ transcript: string }> & { isFinal: boolean };
    const piece = row[0]?.transcript ?? "";
    if (row.isFinal) finalText += piece;
    else interim += piece;
  }
  return { finalText, interim };
}

export type { RecognitionResult };
