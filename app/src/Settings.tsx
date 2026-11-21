import { useState } from 'react';
import { MODELS } from './claude';

export interface SettingsValue {
  apiKey: string;
  model: string;
}

export function SettingsPanel(props: {
  value: SettingsValue;
  onSave: (v: SettingsValue) => void;
  onClose: () => void;
  reason?: string;
}) {
  const [apiKey, setApiKey] = useState(props.value.apiKey);
  const [model, setModel] = useState(props.value.model);
  const [show, setShow] = useState(false);
  const looksValid = apiKey.trim() === '' || apiKey.trim().startsWith('sk-ant-');

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={props.onClose}>
      <form
        className="sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          props.onSave({ apiKey: apiKey.trim(), model });
        }}
      >
        <div className="sheet-head">
          <h2 id="settings-title">Settings</h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close">✕</button>
        </div>
        {props.reason && <p className="notice">{props.reason}</p>}

        <label className="field">
          <span>Claude API key</span>
          <div className="key-row">
            <input
              type={show ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</button>
          </div>
          {!looksValid && <small className="warn">Claude API keys usually start with “sk-ant-”.</small>}
          <small>
            Get one at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>.
            It's stored only in this browser and sent only to Anthropic.
          </small>
        </label>

        <fieldset className="field">
          <legend>Model</legend>
          {MODELS.map((m) => (
            <label key={m.id} className="radio">
              <input type="radio" name="model" value={m.id} checked={model === m.id} onChange={() => setModel(m.id)} />
              <span><strong>{m.label}</strong> · {m.note}</span>
            </label>
          ))}
        </fieldset>

        <div className="sheet-actions">
          {props.value.apiKey && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                setApiKey('');
                props.onSave({ apiKey: '', model });
              }}
            >
              Remove key
            </button>
          )}
          <button type="submit" className="primary">Save</button>
        </div>
      </form>
    </div>
  );
}
