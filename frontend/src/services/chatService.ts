import type { ChatMessage, EvaluationResult, ChatSessionSummary, StoredMessage } from "../types/chat";

const USER_ID = 1;

interface SendMessagePayload {
  tutor_response: string;
  evaluation: EvaluationResult;
  session_id: number;
}

export const sendMessageToAPI = async (
  userMessage: string,
  messageHistory: ChatMessage[],
  proficiencyLevel: string = "B2",
  nativeLanguage: string = "Hebrew",
  sessionId: number | null = null
): Promise<SendMessagePayload> => {
  const response = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_message: userMessage,
      message_history: messageHistory,
      proficiency_level: proficiencyLevel,
      native_language: nativeLanguage,
      user_id: USER_ID,
      session_id: sessionId,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with the AI Tutor.");
  }

  return response.json();
};

export const getChatSessions = async (): Promise<ChatSessionSummary[]> => {
  const response = await fetch(`/api/chat/sessions?user_id=${USER_ID}`);
  if (!response.ok) throw new Error("Failed to load conversation history.");
  return response.json();
};

export const getChatMessages = async (sessionId: number): Promise<StoredMessage[]> => {
  const response = await fetch(`/api/chat/sessions/${sessionId}/messages?user_id=${USER_ID}`);
  if (!response.ok) throw new Error("Failed to load messages.");
  return response.json();
};
