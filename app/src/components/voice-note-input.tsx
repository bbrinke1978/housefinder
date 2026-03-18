"use client";

import { useState, useCallback, useRef } from "react";
import { Mic, MicOff } from "lucide-react";

interface VoiceNoteInputProps {
  onTranscript: (text: string) => void;
}

export function VoiceNoteInput({ onTranscript }: VoiceNoteInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check support on first render (client-side only)
  if (isSupported === null && typeof window !== "undefined") {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);
  }

  const toggleListening = useCallback(() => {
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, onTranscript]);

  if (isSupported === false) {
    return (
      <button
        type="button"
        disabled
        title="Voice input requires Chrome"
        className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground opacity-50 cursor-not-allowed"
      >
        <MicOff className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={isListening ? "Stop recording" : "Start voice input"}
      className={`inline-flex items-center justify-center rounded-md p-2 transition-colors ${
        isListening
          ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}
