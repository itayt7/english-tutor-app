import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { UIMessage, ChatMessage } from '../../types/chat';
import { sendMessageToAPI } from '../../services/chatService';
import { transcribeAudio, synthesizeSpeech } from '../../services/speechService';
import { MessageBubble } from './MessageBubble';

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

    // Update UI immediately with the user's message
    setMessages((prev) => [...prev, newUserMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Prepare history (strip frontend-only UI fields before sending to API)
      const apiHistory: ChatMessage[] = messages.map(m => ({ role: m.role, content: m.content }));

      const response = await sendMessageToAPI(newUserMsg.content, apiHistory);

      // 1. Update the user's message with the shadow evaluation results
      setMessages((prev) =>
        prev.map(msg => msg.id === newUserMsg.id ? { ...msg, evaluation: response.evaluation } : msg)
      );

      // 2. Add the tutor's reply to the chat
      const tutorMsg: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.tutor_response,
      };
      setMessages((prev) => [...prev, tutorMsg]);

      // 3. Auto-play the tutor's reply via TTS
      try {
        const audioUrl = await synthesizeSpeech(response.tutor_response);
        const audio = new Audio(audioUrl);
        audio.play().catch(() => {/* browser may block autoplay – silent fail */});
        // Revoke the object URL once playback ends to free memory
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
  }, [inputValue, messages]);

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
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(t => t.stop());

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size === 0) return;

        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(audioBlob);
          if (text.trim()) {
            setInputValue(text);
            // Automatically send the transcribed message
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

  // Busy when waiting for the AI or transcribing
  const isBusy = isLoading || isTranscribing;

  return (
    <div className="flex flex-col h-[600px] w-full max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4">
        <h2 className="text-xl font-bold">Conversation Practice</h2>
        <p className="text-sm text-slate-300">Talk freely. Grammar corrections will appear below your messages.</p>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            Start the conversation by typing a message or holding the microphone button!
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="text-sm text-gray-500 italic animate-pulse">The tutor is typing...</div>
        )}
        {isTranscribing && (
          <div className="text-sm text-indigo-500 italic animate-pulse">Transcribing your audio...</div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          {/* Record button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={() => isRecording && stopRecording()}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isBusy}
            className={`flex items-center justify-center w-12 h-12 rounded-full transition-colors shrink-0 ${
              isRecording
                ? "bg-red-500 text-white animate-pulse"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            } disabled:opacity-50`}
            title="Hold to record"
            aria-label="Hold to record"
          >
            {/* Microphone SVG icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={isRecording ? "🎙 Recording…" : "Type your message..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isBusy}
          />
          <button
            onClick={() => handleSend()}
            disabled={isBusy}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
