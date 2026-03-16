import type { ChatMessage, EvaluationResult } from "../types/chat";

interface ChatResponsePayload {
  tutor_response: string;
  evaluation: EvaluationResult;
}

export const sendMessageToAPI = async (
  userMessage: string,
  messageHistory: ChatMessage[],
  proficiencyLevel: string = "B2",
  nativeLanguage: string = "Hebrew"
): Promise<ChatResponsePayload> => {
  const response = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_message: userMessage,
      message_history: messageHistory,
      proficiency_level: proficiencyLevel,
      native_language: nativeLanguage,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to communicate with the AI Tutor.");
  }

  return response.json();
};