// Minimal Claude Messages API client that runs in the browser.
// The API key is supplied by the user and only ever sent to api.anthropic.com.

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', note: 'Balanced (recommended)' },
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', note: 'Fastest, cheapest' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', note: 'Most capable, costs more' },
] as const;

export const DEFAULT_MODEL = MODELS[0].id;

export class ClaudeError extends Error {}

function friendlyError(status: number, detail: string): string {
  if (status === 401) return 'Your API key was rejected. Check it in Settings.';
  if (status === 403) return 'This API key is not allowed to use that model.';
  if (status === 404) return 'That model was not found. Try another one in Settings.';
  if (status === 429) return 'Rate limit or credit limit reached. Wait a bit, or check your billing at console.anthropic.com.';
  if (status === 529 || status >= 500) return 'Claude is busy right now. Try again in a moment.';
  return detail || `Request failed (${status}).`;
}

/** Streams a reply. Calls onText with each new chunk; resolves with the full text. */
export async function streamChat(opts: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
  onText: (chunk: string) => void;
}): Promise<string> {
  let res: Response;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: opts.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': opts.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: 4096,
        system: opts.system,
        messages: opts.messages,
        stream: true,
      }),
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ClaudeError('Could not reach Claude. Check your internet connection.');
  }

  if (!res.ok || !res.body) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message ?? '';
    } catch {
      /* ignore */
    }
    throw new ClaudeError(friendlyError(res.status, detail));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const event = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = event.split('\n').find((l) => l.startsWith('data:'));
      if (!dataLine) continue;
      let data;
      try {
        data = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        full += data.delta.text;
        opts.onText(data.delta.text);
      } else if (data.type === 'error') {
        throw new ClaudeError(data.error?.type === 'overloaded_error' ? friendlyError(529, '') : data.error?.message ?? 'Claude returned an error.');
      }
    }
  }
  return full;
}
