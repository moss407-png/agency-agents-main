// "My Money" data model, totals, and the text snapshot shared with agents.
import { load, save } from './storage';

export type Frequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'yearly';

export interface Income { id: string; name: string; amount: number; frequency: Frequency; kind: 'job' | 'side'; hoursPerMonth?: number }
export interface Expense { id: string; name: string; category: string; amount: number }
export interface Debt { id: string; name: string; balance: number; apr: number; minimum: number }
export interface Goal { id: string; name: string; target: number; saved: number; date?: string }

export interface MoneyData {
  incomes: Income[];
  expenses: Expense[];
  debts: Debt[];
  goals: Goal[];
  notes: string;
  updatedAt?: string;
}

export const EMPTY_MONEY: MoneyData = { incomes: [], expenses: [], debts: [], goals: [], notes: '' };

export const FREQUENCIES: { id: Frequency; label: string; perMonth: number }[] = [
  { id: 'weekly', label: 'Weekly', perMonth: 52 / 12 },
  { id: 'biweekly', label: 'Every 2 weeks', perMonth: 26 / 12 },
  { id: 'semimonthly', label: 'Twice a month', perMonth: 2 },
  { id: 'monthly', label: 'Monthly', perMonth: 1 },
  { id: 'yearly', label: 'Yearly', perMonth: 1 / 12 },
];

export const EXPENSE_CATEGORIES = [
  'Housing', 'Utilities', 'Food', 'Transportation', 'Insurance', 'Phone & internet',
  'Subscriptions', 'Health', 'Education', 'Entertainment', 'Shopping', 'Savings', 'Giving', 'Other',
];

const KEY = 'aa.money';

export function loadMoney(): MoneyData {
  const d = load<Partial<MoneyData>>(KEY, {});
  return {
    incomes: Array.isArray(d.incomes) ? d.incomes : [],
    expenses: Array.isArray(d.expenses) ? d.expenses : [],
    debts: Array.isArray(d.debts) ? d.debts : [],
    goals: Array.isArray(d.goals) ? d.goals : [],
    notes: typeof d.notes === 'string' ? d.notes : '',
    updatedAt: d.updatedAt,
  };
}

export function saveMoney(d: MoneyData) {
  save(KEY, d);
}

export const newId = () => Math.random().toString(36).slice(2, 10);

const num = (n: unknown) => (typeof n === 'number' && isFinite(n) ? n : 0);

export function monthlyIncome(i: Income) {
  return num(i.amount) * (FREQUENCIES.find((f) => f.id === i.frequency)?.perMonth ?? 1);
}

export function summarize(d: MoneyData) {
  const income = d.incomes.reduce((s, i) => s + monthlyIncome(i), 0);
  const sideIncome = d.incomes.filter((i) => i.kind === 'side').reduce((s, i) => s + monthlyIncome(i), 0);
  const expenses = d.expenses.reduce((s, e) => s + num(e.amount), 0);
  const debtMinimums = d.debts.reduce((s, x) => s + num(x.minimum), 0);
  const totalDebt = d.debts.reduce((s, x) => s + num(x.balance), 0);
  const savingsBudgeted = d.expenses.filter((e) => e.category === 'Savings').reduce((s, e) => s + num(e.amount), 0);
  const leftOver = income - expenses - debtMinimums;
  const savingsRate = income > 0 ? (savingsBudgeted + Math.max(leftOver, 0)) / income : 0;
  const goalsTarget = d.goals.reduce((s, g) => s + num(g.target), 0);
  const goalsSaved = d.goals.reduce((s, g) => s + num(g.saved), 0);
  const byCategory = new Map<string, number>();
  for (const e of d.expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + num(e.amount));
  return { income, sideIncome, expenses, debtMinimums, totalDebt, leftOver, savingsRate, goalsTarget, goalsSaved, byCategory };
}

export function isEmpty(d: MoneyData) {
  return !d.incomes.length && !d.expenses.length && !d.debts.length && !d.goals.length && !d.notes.trim();
}

export const usd = (n: number, cents = false) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: cents ? 2 : 0, minimumFractionDigits: cents ? 2 : 0 });

/** Markdown snapshot appended to an agent's instructions when the user chooses to share it. */
export function moneySnapshot(d: MoneyData): string {
  const s = summarize(d);
  const lines: string[] = [];
  lines.push('## User\'s financial snapshot');
  lines.push('The user entered this in their "My Money" page and chose to share it with you. Amounts are in USD and are monthly unless noted. Use it to personalize your answers, do the math with these numbers, and ask about anything missing. Never ask for account numbers or passwords.');
  if (d.updatedAt) lines.push(`Last updated: ${d.updatedAt.slice(0, 10)}`);
  lines.push('');
  lines.push(`**Summary:** income ${usd(s.income)}/mo (side income ${usd(s.sideIncome)}), expenses ${usd(s.expenses)}/mo, debt minimums ${usd(s.debtMinimums)}/mo, left over ${usd(s.leftOver)}/mo, total debt ${usd(s.totalDebt)}.`);
  if (d.incomes.length) {
    lines.push('', '### Income (take-home)');
    for (const i of d.incomes) {
      const freq = FREQUENCIES.find((f) => f.id === i.frequency)?.label ?? i.frequency;
      lines.push(`- ${i.name || 'Income'} (${i.kind === 'side' ? 'side income' : 'job'}): ${usd(num(i.amount), true)} ${freq.toLowerCase()} ≈ ${usd(monthlyIncome(i))}/mo${i.hoursPerMonth ? `, about ${i.hoursPerMonth} hours/month` : ''}`);
    }
  }
  if (d.expenses.length) {
    lines.push('', '### Monthly expenses');
    for (const e of d.expenses) lines.push(`- ${e.name || e.category} [${e.category}]: ${usd(num(e.amount), true)}`);
  }
  if (d.debts.length) {
    lines.push('', '### Debts');
    for (const x of d.debts) lines.push(`- ${x.name || 'Debt'}: balance ${usd(num(x.balance), true)}, APR ${num(x.apr)}%, minimum ${usd(num(x.minimum), true)}/mo`);
  }
  if (d.goals.length) {
    lines.push('', '### Savings goals');
    for (const g of d.goals) lines.push(`- ${g.name || 'Goal'}: ${usd(num(g.saved))} saved of ${usd(num(g.target))}${g.date ? `, target date ${g.date}` : ''}`);
  }
  if (d.notes.trim()) lines.push('', '### Notes from the user', d.notes.trim());
  return lines.join('\n');
}
