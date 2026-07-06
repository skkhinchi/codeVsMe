import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage, LearnChatContext } from '../../types/chat';
import './LearnChatPanel.css';

type LearnChatPanelProps = {
  open: boolean;
  context: LearnChatContext | null;
  onClose: () => void;
};

const QUICK_PROMPTS = [
  'Give me a hint',
  'Explain the approach',
  "What's wrong with my code?",
];

function formatOutputPreview(output: string) {
  const trimmed = output.trim();
  if (!trimmed) return 'No output yet — run your code first.';
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

function placeholderReply(prompt: string, context: LearnChatContext) {
  const lineCount = context.code.split('\n').length;
  return `LLM support is coming soon. I already have your code (${lineCount} lines from "${context.fileName}") and output context ready for: "${prompt}"`;
}

export function LearnChatPanel({ open, context, onClose }: LearnChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open || !context) return;

    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'system',
        content:
          'Your current code and run output are attached. Ask for hints, approach guidance, or debugging help.',
      },
    ]);
    setDraft('');
    setShowContext(false);
    window.setTimeout(() => inputRef.current?.focus(), 120);
  }, [context, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  const sendMessage = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !context) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    };

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: placeholderReply(trimmed, context),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    sendMessage(draft);
  };

  if (!open) return null;

  return (
    <div className="learn-chat">
      <button type="button" className="learn-chat__backdrop" aria-label="Close chat" onClick={onClose} />
      <aside className="learn-chat__panel" aria-label="Learning assistant chat">
        <header className="learn-chat__header">
          <div>
            <h2>Learning Assistant</h2>
            <p>Hints, approach, and debugging help</p>
          </div>
          <button type="button" className="learn-chat__close" onClick={onClose} aria-label="Close chat">
            ×
          </button>
        </header>

        {context ? (
          <div className="learn-chat__context">
            <div className="learn-chat__context-main">
              <span className="learn-chat__context-badge">Context attached</span>
              <span className="learn-chat__context-file">{context.fileName}</span>
            </div>
            <button
              type="button"
              className="learn-chat__context-toggle"
              onClick={() => setShowContext((prev) => !prev)}
              aria-expanded={showContext}
            >
              {showContext ? 'Hide' : 'View'} code & output
            </button>
            {showContext ? (
              <div className="learn-chat__context-preview">
                <div className="learn-chat__context-block">
                  <span className="learn-chat__context-label">Code</span>
                  <pre>{context.code || '// Empty editor'}</pre>
                </div>
                <div className="learn-chat__context-block">
                  <span className="learn-chat__context-label">Output</span>
                  <pre>{formatOutputPreview(context.output)}</pre>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="learn-chat__prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="learn-chat__prompt"
              onClick={() => sendMessage(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="learn-chat__messages">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`learn-chat__message learn-chat__message--${message.role}`}
            >
              <span className="learn-chat__message-role">
                {message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Assistant' : 'Info'}
              </span>
              <p>{message.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className="learn-chat__composer" onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            className="learn-chat__input"
            rows={3}
            value={draft}
            placeholder="Ask for a hint, approach, or explanation…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage(draft);
              }
            }}
          />
          <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </aside>
    </div>
  );
}
