import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Agent, Division } from './types';
import { ClaudeError, MODELS, streamChat, type ChatMessage } from './claude';
import { load, save } from './storage';

const storageKey = (id: string) => `aa.chat.${id}`;

export function ChatView(props: {
  agent: Agent;
  division: Division;
  apiKey: string;
  model: string;
  onNeedKey: () => void;
}) {
  const { agent, division } = props;
  const [messages, setMessages] = useState<ChatMessage[]>(() => load(storageKey(agent.id), []));
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!streaming) save(storageKey(agent.id), messages);
  }, [messages, streaming, agent.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, error]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Auto-grow the text box.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    if (!props.apiKey) {
      props.onNeedKey();
      return;
    }
    setError('');
    const history: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let gotText = false;

    try {
      await streamChat({
        apiKey: props.apiKey,
        model: props.model,
        system: agent.body,
        messages: history,
        signal: ctrl.signal,
        onText: (chunk) => {
          gotText = true;
          setMessages((m) => {
            const last = m[m.length - 1];
            return [...m.slice(0, -1), { ...last, content: last.content + chunk }];
          });
        },
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError(e instanceof ClaudeError ? e.message : 'Something went wrong. Try again.');
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
      // No reply arrived: remove the unanswered turn and put the question back to retry.
      if (!gotText) {
        setMessages((m) => m.slice(0, -2));
        setInput((cur) => cur || content);
      }
    }
  };

  const clear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError('');
  };

  const modelLabel = MODELS.find((m) => m.id === props.model)?.label ?? props.model;
  const starters = suggestions(agent);

  return (
    <div className="chat" style={{ '--c': division.color } as React.CSSProperties}>
      <header className="chat-top">
        <a className="back" href={`#agent-${agent.id}`} aria-label="Back to agent">←</a>
        <span className="emoji" aria-hidden>{agent.emoji || '🤖'}</span>
        <div className="chat-title">
          <strong>{agent.name}</strong>
          <small>{modelLabel}</small>
        </div>
        <button className="icon-btn" onClick={clear} disabled={!messages.length && !error} title="New chat">
          New
        </button>
      </header>

      <main className="chat-body">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="emoji big" aria-hidden>{agent.emoji || '🤖'}</span>
            <h2>Chat with {agent.name}</h2>
            <p>{agent.vibe || agent.description}</p>
            {!props.apiKey && (
              <button className="primary" onClick={props.onNeedKey}>Add your Claude API key to start</button>
            )}
            <div className="starters">
              {starters.map((s) => (
                <button key={s} onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'assistant' ? (
              m.content ? (
                <div className="md">
                  <Markdown remarkPlugins={[remarkGfm]}>{m.content}</Markdown>
                </div>
              ) : (
                <div className="typing" aria-label="Thinking"><span /><span /><span /></div>
              )
            ) : (
              <p>{m.content}</p>
            )}
          </div>
        ))}

        {error && (
          <div className="chat-error" role="alert">
            {error}
            {/key|Settings/.test(error) && <button onClick={props.onNeedKey}>Open Settings</button>}
          </div>
        )}
        <div ref={endRef} />
      </main>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          placeholder={`Message ${agent.name}…`}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
              e.preventDefault();
              send(input);
            }
          }}
          aria-label="Message"
        />
        {streaming ? (
          <button type="button" className="send stop" onClick={() => abortRef.current?.abort()} aria-label="Stop">■</button>
        ) : (
          <button type="submit" className="send" disabled={!input.trim()} aria-label="Send">↑</button>
        )}
      </form>
    </div>
  );
}

function suggestions(agent: Agent): string[] {
  const generic = [
    'What can you help me with?',
    `What's the first thing you'd do on a new project?`,
  ];
  const byDivision: Record<string, string> = {
    finance: 'Help me make a simple monthly budget',
    engineering: 'Review my project setup and suggest improvements',
    marketing: 'How should I grow a new YouTube channel?',
    testing: 'How should I test a small web app?',
    security: 'What are the top security mistakes beginners make?',
    design: 'Give me feedback on a simple app layout',
    sales: 'How do I write a good cold email?',
  };
  const extra = byDivision[agent.division];
  return extra ? [generic[0], extra, generic[1]] : generic;
}
