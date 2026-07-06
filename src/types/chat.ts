export type LearnChatContext = {
  code: string;
  fileName: string;
  output: string;
  capturedAt: number;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
};
