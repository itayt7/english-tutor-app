/**
 * Speech Service – talks to the backend /api/speech endpoints.
 *
 * • transcribeAudio  → POST /api/speech/transcribe  (multipart upload)
 * • synthesizeSpeech → POST /api/speech/synthesize   (JSON → audio blob URL)
 */

/**
 * Send a recorded audio blob to the backend for transcription.
 * Returns the transcribed text.
 */
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");

  const response = await fetch("/api/speech/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Transcription request failed: ${detail}`);
  }

  const data: { text: string } = await response.json();
  return data.text;
};

/**
 * Send text to the backend TTS endpoint.
 * Returns an object URL pointing to the audio/mpeg blob that can be
 * played directly by an <audio> element or `new Audio(url).play()`.
 */
export const synthesizeSpeech = async (text: string): Promise<string> => {
  const response = await fetch("/api/speech/synthesize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Speech synthesis request failed: ${detail}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
};
