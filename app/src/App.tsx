import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rawData from './data/agents.json';
import type { Agent, AgentData, Division } from './types';
import { load, save } from './storage';

const data = rawData as AgentData;
const divisionById = new Map<string, Division>(data.divisions.map((d) => [d.id, d]));
const agentById = new Map<string, Agent>(data.agents.map((a) => [a.id, a]));

type Filter = 'all' | 'favorites' | string;

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const m = hash.match(/^#agent-(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export default function App() {
  const agentId = useHashRoute();
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

  const agent = agentId ? agentById.get(agentId) : undefined;

  useEffect(() => {
    document.title = agent ? `${agent.name} · Agency Agents` : 'Agency Agents';
    window.scrollTo(0, 0);
  }, [agent]);

  if (agent) {
    return (
      <AgentDetail
        agent={agent}
        isFavorite={favorites.includes(agent.id)}
        onToggleFavorite={() => toggleFavorite(agent.id)}
      />
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
        <button className="primary" disabled title="Coming in the next stage">
          💬 Chat with this agent <span className="soon">soon</span>
        </button>
        <button onClick={copy}>{copied ? '✓ Copied' : '⧉ Copy prompt'}</button>
      </div>
      <article className="md">
        <Markdown remarkPlugins={[remarkGfm]}>{agent.body}</Markdown>
      </article>
      <footer className="src">Source: {agent.path}</footer>
    </div>
  );
}
