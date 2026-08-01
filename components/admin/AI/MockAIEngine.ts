import { getMockAIResponse, AICopilotResponse } from './MockAIResponses';

export interface ChatMessageModel {
  id: string;
  type: 'user' | 'assistant';
  text?: string;
  response?: AICopilotResponse;
  timestamp: string;
  isStreaming?: boolean;
}

export function simulateStreamingResponse(
  query: string,
  onWordStream: (textSoFar: string) => void,
  onComplete: (response: AICopilotResponse) => void
) {
  const fullResponse = getMockAIResponse(query);
  const textToStream = fullResponse.summary;
  const words = textToStream.split(' ');
  let currentText = '';
  let index = 0;

  // Faster streaming for responsive feel
  const interval = setInterval(() => {
    if (index < words.length) {
      currentText += (index === 0 ? '' : ' ') + words[index];
      onWordStream(currentText);
      index++;
    } else {
      clearInterval(interval);
      onComplete(fullResponse);
    }
  }, 45); // Speed suited to simulate Gemini 2.5 Flash streaming
}
