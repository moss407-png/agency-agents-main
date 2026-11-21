import { useEffect, useRef, useState } from 'react';
import type { Agent } from './types';
import {
  EXPENSE_CATEGORIES, FREQUENCIES, newId, summarize, usd,
  type Debt, type Expense, type Goal, type Income, type MoneyData,
} from './money';

export function MyMoney(props: {
  data: MoneyData;
  onChange: (d: MoneyData) => void;
  personalAgents: Agent[];
}) {
  const { data, onChange } = props;
  const s = summarize(data);
  const update = (patch: Partial<MoneyData>) => onChange({ ...data, ...patch, updatedAt: new Date().toISOString() });

  return (
    <div className="page money">
      <header className="detail-top">
        <a className="back" href="#">← All agents</a>
      </header>
      <h1 className="money-title">My Money</h1>
      <p className="muted">
        A private snapshot of your finances. It's saved only in this browser. Finance agents see it only when you
        turn on <strong>📎 My Money</strong> in a chat.
      </p>

      <section className="stats" aria-label="Monthly summary">
        <Stat label="Income / mo" value={usd(s.income)} />
        <Stat label="Expenses / mo" value={usd(s.expenses)} />
        <Stat label="Debt minimums" value={usd(s.debtMinimums)} />
        <Stat label="Left over" value={usd(s.leftOver)} tone={s.leftOver < 0 ? 'bad' : s.leftOver > 0 ? 'good' : undefined} />
        <Stat label="Total debt" value={usd(s.totalDebt)} />
        <Stat label="Could save" value={`${Math.round(s.savingsRate * 100)}% of income`} />
      </section>

      {s.expenses > 0 && <CategoryBars byCategory={s.byCategory} total={s.expenses} />}

      <Section title="Income" hint="Take-home pay (after taxes). Mark side hustles as “Side”.">
        {data.incomes.map((i) => (
          <Row key={i.id} onRemove={() => update({ incomes: data.incomes.filter((x) => x.id !== i.id) })}>
            <TextIn label="Name" value={i.name} placeholder="Job, YouTube…" onChange={(v) => update({ incomes: patchItem(data.incomes, i.id, { name: v }) })} />
            <NumIn label="Amount" prefix="$" value={i.amount} onChange={(v) => update({ incomes: patchItem(data.incomes, i.id, { amount: v }) })} />
            <label className="mini">
              <span>How often</span>
              <select value={i.frequency} onChange={(e) => update({ incomes: patchItem(data.incomes, i.id, { frequency: e.target.value as Income['frequency'] }) })}>
                {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
            <label className="mini">
              <span>Type</span>
              <select value={i.kind} onChange={(e) => update({ incomes: patchItem(data.incomes, i.id, { kind: e.target.value as Income['kind'] }) })}>
                <option value="job">Job</option>
                <option value="side">Side</option>
              </select>
            </label>
            {i.kind === 'side' && (
              <NumIn label="Hours / mo" value={i.hoursPerMonth ?? 0} onChange={(v) => update({ incomes: patchItem(data.incomes, i.id, { hoursPerMonth: v }) })} />
            )}
          </Row>
        ))}
        <AddButton label="Add income" onClick={() => update({ incomes: [...data.incomes, { id: newId(), name: '', amount: 0, frequency: 'biweekly', kind: 'job' }] })} />
      </Section>

      <Section title="Monthly expenses" hint="Bills and typical spending per month. Put money you save each month under “Savings”.">
        {data.expenses.map((e) => (
          <Row key={e.id} onRemove={() => update({ expenses: data.expenses.filter((x) => x.id !== e.id) })}>
            <TextIn label="Name" value={e.name} placeholder="Rent, groceries…" onChange={(v) => update({ expenses: patchItem(data.expenses, e.id, { name: v }) })} />
            <label className="mini">
              <span>Category</span>
              <select value={e.category} onChange={(ev) => update({ expenses: patchItem(data.expenses, e.id, { category: ev.target.value }) })}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <NumIn label="Per month" prefix="$" value={e.amount} onChange={(v) => update({ expenses: patchItem(data.expenses, e.id, { amount: v }) })} />
          </Row>
        ))}
        <AddButton label="Add expense" onClick={() => update({ expenses: [...data.expenses, { id: newId(), name: '', category: 'Housing', amount: 0 }] })} />
      </Section>

      <Section title="Debts" hint="Credit cards, loans, buy-now-pay-later. Minimums are counted above.">
        {data.debts.map((d) => (
          <Row key={d.id} onRemove={() => update({ debts: data.debts.filter((x) => x.id !== d.id) })}>
            <TextIn label="Name" value={d.name} placeholder="Credit card…" onChange={(v) => update({ debts: patchItem(data.debts, d.id, { name: v }) })} />
            <NumIn label="Balance" prefix="$" value={d.balance} onChange={(v) => update({ debts: patchItem(data.debts, d.id, { balance: v }) })} />
            <NumIn label="APR" suffix="%" value={d.apr} onChange={(v) => update({ debts: patchItem(data.debts, d.id, { apr: v }) })} />
            <NumIn label="Minimum" prefix="$" value={d.minimum} onChange={(v) => update({ debts: patchItem(data.debts, d.id, { minimum: v }) })} />
          </Row>
        ))}
        <AddButton label="Add debt" onClick={() => update({ debts: [...data.debts, { id: newId(), name: '', balance: 0, apr: 0, minimum: 0 }] })} />
      </Section>

      <Section title="Savings goals" hint="Emergency fund, a car, a laptop…">
        {data.goals.map((g) => {
          const pct = g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0;
          return (
            <Row key={g.id} onRemove={() => update({ goals: data.goals.filter((x) => x.id !== g.id) })}>
              <TextIn label="Goal" value={g.name} placeholder="Emergency fund…" onChange={(v) => update({ goals: patchItem(data.goals, g.id, { name: v }) })} />
              <NumIn label="Target" prefix="$" value={g.target} onChange={(v) => update({ goals: patchItem(data.goals, g.id, { target: v }) })} />
              <NumIn label="Saved" prefix="$" value={g.saved} onChange={(v) => update({ goals: patchItem(data.goals, g.id, { saved: v }) })} />
              <label className="mini">
                <span>By (optional)</span>
                <input type="month" value={g.date ?? ''} onChange={(e) => update({ goals: patchItem(data.goals, g.id, { date: e.target.value || undefined }) })} />
              </label>
              <div className="progress" aria-label={`${pct}% saved`}><span style={{ width: `${pct}%` }} /><em>{pct}%</em></div>
            </Row>
          );
        })}
        <AddButton label="Add goal" onClick={() => update({ goals: [...data.goals, { id: newId(), name: '', target: 0, saved: 0 }] })} />
      </Section>

      <Section title="Notes" hint="Anything the agents should know: pay schedule, upcoming costs, what you're working toward.">
        <textarea className="notes" rows={4} value={data.notes} onChange={(e) => update({ notes: e.target.value })} placeholder="e.g. Paid every other Friday. Want to buy a car next summer." />
      </Section>

      {props.personalAgents.length > 0 && (
        <section className="money-agents">
          <h2>Talk it through</h2>
          <div className="agent-links">
            {props.personalAgents.map((a) => (
              <a key={a.id} href={`#chat-${a.id}`} className="agent-link">
                <span aria-hidden>{a.emoji}</span> {a.name}
              </a>
            ))}
          </div>
        </section>
      )}

      <Backup data={data} onImport={(d) => onChange({ ...d, updatedAt: new Date().toISOString() })} />
    </div>
  );
}

function patchItem<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((x) => (x.id === id ? { ...x, ...patch } : x));
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`stat${tone ? ` ${tone}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CategoryBars({ byCategory, total }: { byCategory: Map<string, number>; total: number }) {
  const rows = [...byCategory.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  return (
    <section className="cats" aria-label="Spending by category">
      {rows.map(([cat, v]) => (
        <div key={cat} className="cat-row">
          <span className="cat-name">{cat}</span>
          <span className="cat-bar"><span style={{ width: `${(v / total) * 100}%` }} /></span>
          <span className="cat-val">{usd(v)} · {Math.round((v / total) * 100)}%</span>
        </div>
      ))}
    </section>
  );
}

function Section(props: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="money-section">
      <h2>{props.title}</h2>
      <p className="muted small">{props.hint}</p>
      <div className="rows">{props.children}</div>
    </section>
  );
}

function Row(props: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="row">
      <div className="row-fields">{props.children}</div>
      <button className="remove" onClick={props.onRemove} aria-label="Remove">✕</button>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return <button className="add" onClick={onClick}>+ {label}</button>;
}

function TextIn(props: { label: string; value: string; placeholder?: string; onChange: (v: string) => void }) {
  return (
    <label className="mini grow">
      <span>{props.label}</span>
      <input value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} />
    </label>
  );
}

function NumIn(props: { label: string; value: number; prefix?: string; suffix?: string; onChange: (v: number) => void }) {
  const [text, setText] = useState(props.value ? String(props.value) : '');
  const last = useRef(props.value);
  useEffect(() => {
    if (props.value !== last.current) {
      last.current = props.value;
      setText(props.value ? String(props.value) : '');
    }
  }, [props.value]);
  return (
    <label className="mini num">
      <span>{props.label}</span>
      <span className="affix">
        {props.prefix && <i>{props.prefix}</i>}
        <input
          inputMode="decimal"
          value={text}
          placeholder="0"
          onChange={(e) => {
            const t = e.target.value.replace(/[^0-9.]/g, '');
            setText(t);
            const n = parseFloat(t);
            last.current = isFinite(n) ? n : 0;
            props.onChange(last.current);
          }}
        />
        {props.suffix && <i>{props.suffix}</i>}
      </span>
    </label>
  );
}

function Backup({ data, onImport }: { data: MoneyData; onImport: (d: MoneyData) => void }) {
  const [msg, setMsg] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const t = new Date();
    a.download = `my-money-${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg('Backup downloaded.');
  };

  const importJson = async (file: File) => {
    try {
      const d = JSON.parse(await file.text());
      if (!d || typeof d !== 'object' || !Array.isArray(d.incomes) || !Array.isArray(d.expenses)) throw new Error();
      onImport({
        incomes: d.incomes as Income[],
        expenses: d.expenses as Expense[],
        debts: (Array.isArray(d.debts) ? d.debts : []) as Debt[],
        goals: (Array.isArray(d.goals) ? d.goals : []) as Goal[],
        notes: typeof d.notes === 'string' ? d.notes : '',
      });
      setMsg('Backup restored.');
    } catch {
      setMsg('That file isn’t a My Money backup.');
    }
  };

  return (
    <section className="money-section backup">
      <h2>Backup</h2>
      <p className="muted small">Your data lives only in this browser. Download a backup to move it to another device.</p>
      <div className="backup-actions">
        <button onClick={exportJson}>⬇ Download backup</button>
        <button onClick={() => fileRef.current?.click()}>⬆ Restore backup</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ''; }} />
        <button
          className="danger"
          onClick={() => {
            if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 4000); return; }
            onImport({ incomes: [], expenses: [], debts: [], goals: [], notes: '' });
            setConfirmClear(false);
            setMsg('All My Money data cleared.');
          }}
        >
          {confirmClear ? 'Tap again to clear everything' : 'Clear all'}
        </button>
      </div>
      {msg && <p className="small" role="status">{msg}</p>}
    </section>
  );
}
