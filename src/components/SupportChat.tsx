import { FormEvent, useEffect, useState } from 'react';
import { askSupportAgent, type SupportMessage } from '../lib/supportAgent';

const CHAT_KEY = 'baw-support-chat-v1';
const welcomeMessage: SupportMessage = {
  id: 'welcome',
  role: 'assistant',
  text: 'Я рядом. Можешь рассказать, что сейчас чувствуешь или почему трудно начать.',
};

function loadMessages() {
  try {
    const saved = window.localStorage.getItem(CHAT_KEY);
    return saved ? JSON.parse(saved) as SupportMessage[] : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
}

type Props = {
  task: string;
  reason: string;
};

export function SupportChat({ task, reason }: Props) {
  const [messages, setMessages] = useState<SupportMessage[]>(loadMessages);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(CHAT_KEY, JSON.stringify(messages));
  }, [messages]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || isLoading) return;
    const userMessage: SupportMessage = { id: crypto.randomUUID(), role: 'user', text };
    const previousMessages = messages;
    setMessages([...previousMessages, userMessage]);
    setDraft('');
    setError('');
    setIsLoading(true);
    try {
      const answer = await askSupportAgent({
        task,
        reason,
        messages: previousMessages,
        userMessage: text,
      });
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
      }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не получилось получить ответ.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="support-chat" aria-label="Диалог с ИИ-напарником">
      <div className="support-chat__messages" aria-live="polite">
        {messages.map((message) => (
          <p className={`support-message support-message--${message.role}`} key={message.id}>
            {message.text}
          </p>
        ))}
        {isLoading && <p className="support-message support-message--assistant">Думаю, как лучше тебя поддержать…</p>}
      </div>
      {error && <p className="ai-error" role="alert">{error}</p>}
      <form className="support-chat__composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="support-message">Сообщение ИИ-напарнику</label>
        <textarea id="support-message" value={draft}
          placeholder="Напиши, что сейчас происходит…"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }} />
        <button className="primary-action" type="submit" disabled={!draft.trim() || isLoading}>
          Отправить <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  );
}
