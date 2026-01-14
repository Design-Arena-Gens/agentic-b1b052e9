export {};

declare global {
  interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
  }

  interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    error: string;
  }

  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    start(): void;
    stop(): void;
    abort(): void;
    onaudiostart: ((event: Event) => void) | null;
    onsoundstart: ((event: Event) => void) | null;
    onspeechstart: ((event: Event) => void) | null;
    onspeechend: ((event: Event) => void) | null;
    onsoundend: ((event: Event) => void) | null;
    onaudioend: ((event: Event) => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onnomatch: ((event: Event) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
  }

  interface SpeechRecognitionConstructor {
    new (): SpeechRecognition;
    prototype: SpeechRecognition;
  }

  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
