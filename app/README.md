# Agency Agents App

A web app for browsing and using the [agency-agents]collection in this repo of AI specialist personas. It works in the browser, can be installed on a phone's home screen (PWA), and is set up to be wrapped as a desktop app later.

## Features (stage 1)
- Search all agents by name, description or vibe
- Filter by division (Engineering, Finance, Marketing…)
- Save favorites (★), remembered on your device
- Read each agent's full instructions, nicely formatted
- Copy an agent's prompt to paste into Claude, Cursor, etc.

## Chat (stage 2)
- Tap **Chat with this agent** on any agent page
- Add your Claude API key in **Settings** (gear icon). Get one at https://console.anthropic.com/settings/keys
- Pick a model: Sonnet 5.5 (default), Haiku 5.5 (cheapest) or Opus 5.5 (most capable)
- Replies stream in live; tap ■ to stop, **New** to start over
- Each agent's conversation is saved in your browser

Your key is stored only in your browser and sent only to `api.anthropic.com`. Don't share a link to the app with your key already entered on a shared device. Use **Remove key** in Settings if needed.

Coming next: personal finance agents (stage 3).

## Online version
Every push to `main` that changes the app or agents rebuilds and publishes it to GitHub Pages
(`.github/workflows/deploy-app.yml`): https://moss407-png.github.io/agency-agents-main/

## Run it

Requires Node.js 20+.

```bash
npm install
npm run dev        # open the local URL it prints
```

## Update the agent data

The agents live in `src/data/agents.json`, generated from the agency-agents repo:

```bash
npm run extract   # reads the agents from the repo folder above
```

## Build

```bash
npm run build          # installable web app in dist/
npm run build:preview  # one self-contained HTML file in dist-preview/
```

## Project layout
- `src/App.tsx`: the app (list, search, filters, agent page, routing)
- `src/Chat.tsx`: chat screen
- `src/Settings.tsx`: API key and model settings
- `src/claude.ts`: streaming Claude API client
- `src/index.css`: styles (light and dark mode)
- `src/data/agents.json`: generated agent data
- `scripts/extract-agents.mjs`: turns the agent markdown into JSON
- `public/`: app icon, manifest and offline service worker
