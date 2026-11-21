import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rawData from './data/agents.json';
import type { Agent, AgentData, Division } from './types';
import { load, save } from './storage';
import { ChatView } from './Chat';
import { SettingsPanel, type SettingsValue } from './Settings';
import { DEFAULT_MODEL, MODELS } from './claude';
import { MyMoney } from './MyMoney';
import { loadMoney, saveMoney, type MoneyData } from './money';

const data = rawData as AgentData;
const divisionById = new Map<string, Division>(data.divisions.map((d) => [d.id, d]));
const agentById = new Map<string, Agent>(data.agents.map((a) => [a.id, a]));
const personalAgents = data.agents.filter((a) => a.id.startsWith('finance-personal-'));

type Filter = 'all' | 'favorites' | string;

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  if (hash === '#my-money') return { view: 'money' as const, id: '' };
  const m = hash.match(/^#(agent|chat)-(.+)$/);
  return m ? { view: m[1] as 'agent' | 'chat', id: decodeURIComponent(m[2]) } : null;
}

export default function App() {
  const route = useHashRoute();
  const [settings, setSettings] = useState<SettingsValue>(() => {
    const model = load('aa.model', DEFAULT_MODEL);
    return { apiKey: load('aa.apiKey', ''), model: MODELS.some((m) => m.id === model) ? model : DEFAULT_MODEL };
  });
  const [settingsOpen, setSettingsOpen] = useState<false | { reason?: string }>(false);
  const saveSettings = (v: SettingsValue) => {
    setSettings(v);
    save('aa.apiKey', v.apiKey);
    save('aa.model', v.model);
    setSettingsOpen(false);
  };
  const [money, setMoney] = useState<MoneyData>(loadMoney);
  const changeMoney = (d: MoneyData) => {
    setMoney(d);
    saveMoney(d);
  };
  const askForKey = () => setSettingsOpen({ reason: 'Add your Claude API key to chat with agents.' });
  const settingsPanel = settingsOpen && (
    <SettingsPanel value={settings} onSave={saveSettings} onClose={() => setSettingsOpen(false)} reason={settingsOpen.reason} />
  );
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(() => load('aa.filter', 'all'));
  const [favorites, setFavorites] = useState<string[]>(() => load('aa.favorites', []));
  const deferredQuery = useDeferredValue(query);

  useEffect(() => save('aa.filter', filter), [filter]);
  useEffect(() => save('aa.favorites', favorites), [favorites]);

  const toggleFavorite = (id: string) =>
    setFavorites((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  const results = useMemo(() => {
    const terms = deferredQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return data.agents.filter((a) => {
      if (filter === 'favorites' && !favorites.includes(a.id)) return false;
      if (filter !== 'all' && filter !== 'favorites' && a.division !== filter) return false;
      if (!terms.length) return true;
      const hay = `${a.name} ${a.description} ${a.vibe} ${divisionById.get(a.division)?.label ?? ''}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [deferredQuery, filter, favorites]);

  const agent = route ? agentById.get(route.id) : undefined;
  const view = route?.view === 'money' ? 'money' : agent ? route!.view : 'list';

  useEffect(() => {
    document.title =
      view === 'money' ? 'My Money · Agency Agents'
      : agent ? `${view === 'chat' ? 'Chat · ' : ''}${agent.name} · Agency Agents` : 'Agency Agents';
    window.scrollTo(0, 0);
  }, [agent, view]);

  if (view === 'money') {
    return <MyMoney data={money} onChange={changeMoney} personalAgents={personalAgents} />;
  }

  if (agent && view === 'chat') {
    return (
      <>
        <ChatView
          key={agent.id}
          agent={agent}
          division={divisionById.get(agent.division)!}
          apiKey={settings.apiKey}
          model={settings.model}
          onNeedKey={askForKey}
          money={money}
        />
        {settingsPanel}
      </>
    );
  }

  if (agent) {
    return (
      <>
        <AgentDetail
          agent={agent}
          isFavorite={favorites.includes(agent.id)}
          onToggleFavorite={() => toggleFavorite(agent.id)}
        />
        {settingsPanel}
      </>
    );
  }

  return (
    <div className="page">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>◆</span>
          <div>
            <h1>Agency Agents</h1>
            <p className="sub">{data.agents.length} AI specialists, ready to help</p>
          </div>
          <a className="money-btn" href="#my-money">💵 My Money</a>
          <button className="settings-btn" onClick={() => setSettingsOpen({})} aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden>
              <path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 0 0-1.7-1L15 3.5h-4l-.4 2.5a7.3 7.3 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.5h4l.4-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6ZM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" transform="translate(-1 0)" />
            </svg>
          </button>
        </div>
        <div className="search">
          <svg viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder={`Search ${data.agents.length} agents…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search agents"
          />
        </div>
        <nav className="chips" aria-label="Filter by division">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="All" count={data.agents.length} />
          <Chip
            active={filter === 'favorites'}
            onClick={() => setFilter('favorites')}
            label="★ Saved"
            count={favorites.length}
          />
          {data.divisions.map((d) => (
            <Chip
              key={d.id}
              active={filter === d.id}
              onClick={() => setFilter(d.id)}
              label={d.label}
              count={d.count}
              color={d.color}
            />
          ))}
        </nav>
      </header>

      <main>
        <p className="count">
          {results.length} {results.length === 1 ? 'agent' : 'agents'}
        </p>
        {results.length === 0 ? (
          <div className="empty">
            {filter === 'favorites' && !query
              ? 'No saved agents yet. Tap ☆ on any agent to save it here.'
              : 'No agents match that search.'}
          </div>
        ) : (
          <ul className="grid">
            {results.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                isFavorite={favorites.includes(a.id)}
                onToggleFavorite={() => toggleFavorite(a.id)}
              />
            ))}
          </ul>
        )}
      </main>
      {settingsPanel}
    </div>
  );
}

function Chip(props: { active: boolean; onClick: () => void; label: string; count: number; color?: string }) {
  return (
    <button
      className={`chip${props.active ? ' active' : ''}`}
      onClick={props.onClick}
      style={props.color ? ({ '--c': props.color } as React.CSSProperties) : undefined}
    >
      {props.color && <span className="dot" />}
      {props.label}
      <span className="n">{props.count}</span>
    </button>
  );
}

function FavButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      className={`fav${on ? ' on' : ''}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={on ? 'Remove from saved' : 'Save agent'}
      aria-pressed={on}
    >
      {on ? '★' : '☆'}
    </button>
  );
}

function AgentCard({ agent, isFavorite, onToggleFavorite }: { agent: Agent; isFavorite: boolean; onToggleFavorite: () => void }) {
  const div = divisionById.get(agent.division)!;
  return (
    <li>
      <a className="card" href={`#agent-${agent.id}`} style={{ '--c': div.color } as React.CSSProperties}>
        <div className="card-head">
          <span className="emoji" aria-hidden>{agent.emoji || '🤖'}</span>
          <FavButton on={isFavorite} onClick={onToggleFavorite} />
        </div>
        <h2>{agent.name}</h2>
        <span className="tag">{div.label}</span>
        <p>{agent.vibe || agent.description}</p>
      </a>
    </li>
  );
}

function AgentDetail({ agent, isFavorite, onToggleFavorite }: { agent: Agent; isFavorite: boolean; onToggleFavorite: () => void }) {
  const div = divisionById.get(agent.division)!;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(agent.body);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = agent.body;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="page detail" style={{ '--c': div.color } as React.CSSProperties}>
      <header className="detail-top">
        <a className="back" href="#">← All agents</a>
        <FavButton on={isFavorite} onClick={onToggleFavorite} />
      </header>
      <section className="hero">
        <span className="emoji big" aria-hidden>{agent.emoji || '🤖'}</span>
        <div>
          <span className="tag">{div.label}</span>
          <h1>{agent.name}</h1>
          {agent.vibe && <p className="vibe">{agent.vibe}</p>}
        </div>
      </section>
      <p className="desc">{agent.description}</p>
      <div className="actions">
        <a className="btn primary" href={`#chat-${agent.id}`}>💬 Chat with this agent</a>
        <button onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy prompt'}</button>
      </div>
      <article className="md">
        <Markdown remarkPlugins={[remarkGfm]}>{agent.body}</Markdown>
      </article>
      <footer className="src">Source: {agent.path}</footer>
    </div>
  );
}
