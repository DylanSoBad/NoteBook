'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Copy,
  KeyRound,
  LoaderCircle,
  RotateCcw,
  Send,
  UserRound,
} from 'lucide-react';
import type { T3ChatMessage } from '@/lib/t3-chat';

type VisibleMessage = T3ChatMessage & { id: string };

export default function T3Chat() {
  const [apiKey, setApiKey] = useState('');
  const [keyOpen, setKeyOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<VisibleMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const controller = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(id);
  }, [notice]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || !apiKey.trim() || controller.current) return;

    const nextMessage: VisibleMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
    };
    const nextMessages = [...messages, nextMessage];
    const abort = new AbortController();
    controller.current = abort;
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          messages: nextMessages
            .slice(-24)
            .map(({ role, content: messageContent }) => ({
              role,
              content: messageContent,
            })),
        }),
        signal: abort.signal,
      });
      const data = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok || !data.message)
        throw Error(data.error || 'T3 chưa trả lời. Hãy thử lại.');
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: data.message!,
        },
      ]);
    } catch (caught) {
      if (!abort.signal.aborted) {
        setMessages(nextMessages.slice(0, -1));
        setError(
          caught instanceof Error
            ? caught.message
            : 'Chưa kết nối được T3. Hãy thử lại.',
        );
        setInput(content);
      }
    } finally {
      controller.current = null;
      if (!abort.signal.aborted) setBusy(false);
    }
  }

  async function copy(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setNotice('Đã sao chép câu trả lời.');
    } catch {
      setNotice('Chưa sao chép được.');
    }
  }

  function resetChat() {
    controller.current?.abort();
    controller.current = null;
    setMessages([]);
    setInput('');
    setBusy(false);
    setError('');
  }

  return (
    <section className="t3chat" aria-labelledby="t3-chat-heading">
      <header className="t3chatheader">
        <div>
          <p className="t3kicker">
            <Bot size={16} /> T3 / XPIKI
          </p>
          <h2 id="t3-chat-heading">Chat với T3</h2>
          <p>Claude Sonnet 4.6 · Cuộc chat chỉ nằm trong tab này.</p>
        </div>
        {messages.length > 0 && (
          <button className="action" type="button" onClick={resetChat}>
            <RotateCcw size={16} /> Chat mới
          </button>
        )}
      </header>

      <div className="t3keybar">
        <button
          type="button"
          className="action"
          aria-expanded={keyOpen}
          onClick={() => setKeyOpen((open) => !open)}
        >
          <KeyRound size={16} /> {apiKey ? 'API key đã thêm' : 'Add API key'}
        </button>
        {apiKey && (
          <button
            type="button"
            className="textbutton"
            onClick={() => {
              setApiKey('');
              setKeyOpen(false);
            }}
          >
            Xóa key
          </button>
        )}
      </div>

      {keyOpen && (
        <div className="t3keypanel">
          <label htmlFor="t3-api-key">API key T3 / XPiKi</label>
          <input
            id="t3-api-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            maxLength={512}
            disabled={busy}
            placeholder="sk-…"
          />
          <p>
            Key không được lưu vào database hoặc GitHub. Đóng tab là key biến
            mất.
          </p>
        </div>
      )}

      <div className="t3messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="t3empty">
            <Bot size={32} />
            <h3>Bạn muốn hỏi gì?</h3>
            <p>
              Brainstorm, phân tích một dự án Web3, viết nội dung hoặc hỏi bất
              cứ điều gì.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`t3message ${message.role}`}>
              <span className="t3avatar" aria-hidden="true">
                {message.role === 'assistant' ? (
                  <Bot size={17} />
                ) : (
                  <UserRound size={17} />
                )}
              </span>
              <div>
                <strong>{message.role === 'assistant' ? 'T3' : 'Bạn'}</strong>
                <p>{message.content}</p>
                {message.role === 'assistant' && (
                  <button
                    type="button"
                    className="iconbutton"
                    aria-label="Sao chép câu trả lời"
                    onClick={() => void copy(message.content)}
                  >
                    <Copy size={15} />
                  </button>
                )}
              </div>
            </article>
          ))
        )}
        {busy && (
          <div className="t3typing" role="status">
            <LoaderCircle className="t3spin" size={17} /> T3 đang trả lời…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div className="errorbox" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <p className="t3notice" role="status">
          {notice}
        </p>
      )}

      <form className="t3composer" onSubmit={send}>
        <label className="sr-only" htmlFor="t3-message">
          Tin nhắn cho T3
        </label>
        <textarea
          id="t3-message"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          rows={2}
          maxLength={8000}
          disabled={busy}
          placeholder={
            apiKey
              ? 'Nhắn cho T3… (Shift + Enter để xuống dòng)'
              : 'Thêm API key để bắt đầu chat'
          }
        />
        <button
          type="submit"
          className="action primary"
          disabled={busy || !apiKey.trim() || !input.trim()}
          aria-label="Gửi tin nhắn"
        >
          {busy ? (
            <LoaderCircle className="t3spin" size={19} />
          ) : (
            <Send size={19} />
          )}
          Gửi
        </button>
      </form>
    </section>
  );
}
