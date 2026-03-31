import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { UIMessage, ChatMessage, EvaluationResult } from '../../types/chat';
import { sendMessageToAPI, getChatMessages } from '../../services/chatService';
import { transcribeAudio, synthesizeSpeech } from '../../services/speechService';
import { MessageBubble } from './MessageBubble';

interface Props {
  initialSessionId?: number | null;
  onSessionCreated?: (sessionId: number) => void;
}

function storedEvalToResult(json: string | null): EvaluationResult | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as EvaluationResult;
  } catch {
    return undefined;
  }
}

export const ChatInterface: React.FC<Props> = ({ initialSessionId = null, onSessionCreated }) => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load messages when an existing session is selected
  useEffect(() => {
    setSessionId(initialSessionId ?? null);

    if (!initialSessionId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    getChatMessages(initialSessionId)
      .then((stored) => {
        const loaded: UIMessage[] = stored.map((m) => ({
          id: String(m.id),
          role: m.role,
          content: m.content,
          evaluation: storedEvalToResult(m.evaluation_json),
        }));
        setMessages(loaded);
      })
      .catch(() => setMessages([]))
      .finally(() => setIsLoading(false));
  }, [initialSessionId]);

  // Auto-scroll to bottom
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ---------------------------------------------------------------------------
  // Send message to the AI tutor and auto-play the response
  // ---------------------------------------------------------------------------
  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText ?? inputValue;
    if (!text.trim()) return;

    const newUserMsg: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      const apiHistory: ChatMessage[] = [
        ...messages.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: newUserMsg.content },
      ];

      const response = await sendMessageToAPI(newUserMsg.content, apiHistory, "B2", "Hebrew", sessionId);

      // Attach evaluation to the user's message
      setMessages((prev) =>
        prev.map(msg => msg.id === newUserMsg.id ? { ...msg, evaluation: response.evaluation } : msg)
      );

      // Add tutor reply
      const tutorMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.tutor_response,
      };
      setMessages((prev) => [...prev, tutorMsg]);

      // Track session_id from first response
      if (sessionId === null) {
        setSessionId(response.session_id);
        onSessionCreated?.(response.session_id);
      }

      // Auto-play TTS
      try {
        const audioUrl = await synthesizeSpeech(response.tutor_response);
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {/* browser may block autoplay – silent fail */});
        audio.addEventListener("ended", () => URL.revokeObjectURL(audioUrl));
      } catch (ttsError) {
        console.warn("TTS playback failed, continuing silently.", ttsError);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to send message. Please check the backend connection.");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, sessionId, onSessionCreated]);

  // ---------------------------------------------------------------------------
  // Microphone recording helpers
  // ---------------------------------------------------------------------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          if (text.trim()) {
            setInputValue(text);
            await handleSend(text);
          }
        } catch (err) {
          console.error("Transcription error:", err);
          alert("Failed to transcribe audio. Please try again.");
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Microphone permission denied. Please allow microphone access and try again.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const isBusy = isLoading || isTranscribing;

  return (
    <div
      className="flex flex-col w-full max-w-3xl mx-auto rounded-2xl overflow-hidden"
      style={{
        height: '600px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--color-border)',
      }}
    >
      {/* Header */}
      <div
        className="gradient-primary px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h2
          className="text-xl font-extrabold text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Conversation Practice
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(199,210,254,0.8)' }}>
          Talk freely. Grammar corrections will appear below your messages.
        </p>
      </div>

      {/* Message Area */}
      <div
        className="flex-1 overflow-y-auto p-6 space-y-1"
        style={{
          background: 'var(--color-surface)',
          backgroundImage:
            'radial-gradient(circle, rgba(99,102,241,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        {messages.length === 0 && !isBusy && (
          <div
            className="flex flex-col items-center justify-center h-full text-center gap-3 pb-8"
            style={{ color: 'var(--color-muted)' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.1))',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                style={{ color: 'var(--color-primary)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium max-w-xs">
              Start the conversation by typing a message or holding the microphone button!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div
            className="text-sm italic animate-pulse px-3"
            style={{ color: 'var(--color-muted)' }}
          >
            {messages.length === 0 ? "Loading conversation…" : "The tutor is typing…"}
          </div>
        )}
        {isTranscribing && (
          <div
            className="text-sm italic animate-pulse px-3"
            style={{ color: 'var(--color-primary)' }}
          >
            Transcribing your audio…
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div
        className="shrink-0 p-4"
        style={{
          background: '#fff',
          borderTop: '1px solid var(--color-border)',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex gap-2 items-center">
          {/* Record button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => isRecording && stopRecording()}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isBusy && !isRecording}
            className={`flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-all ${
              isRecording ? 'recording-pulse' : ''
            } disabled:opacity-50`}
            style={
              isRecording
                ? {
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    boxShadow: 'var(--shadow-glow-red)',
                  }
                : {
                    background: 'var(--color-bg)',
                    color: 'var(--color-muted)',
                    border: '1px solid var(--color-border)',
                  }
            }
            title="Hold to record"
            aria-label="Hold to record"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <input
            type="text"
            className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
            style={{
              border: '1px solid var(--color-border-strong)',
              background: 'var(--color-bg)',
              color: 'var(--color-text)',
              transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
            }}
            placeholder={isRecording ? "Recording…" : "Type your message…"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary)';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-strong)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            disabled={isBusy}
            aria-label="Message input"
          />
          <button
            onClick={() => handleSend()}
            disabled={isBusy || !inputValue.trim()}
            className="gradient-primary shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
