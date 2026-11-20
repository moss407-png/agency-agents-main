# Agency Agents App

A web app for browsing and using the [agency-agents]collection in this repo of AI specialist personas. It works in the browser, can be installed on a phone's home screen (PWA), and is set up to be wrapped as a desktop app later.

## Features (stage 1)
- Search all agents by name, description or vibe
- Filter by division (Engineering, Finance, Marketing…)
- Save favorites (★), remembered on your device
- Read each agent's full instructions, nicely formatted
- Copy an agent's prompt to paste into Claude, Cursor, etc.

Coming next: chat with any agent through the Claude API, then personal finance agents.

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
- `src/App.tsx`: the app (list, search, filters, agent page)
- `src/index.css`: styles (light and dark mode)
- `src/data/agents.json`: generated agent data
- `scripts/extract-agents.mjs`: turns the agent markdown into JSON
- `public/`: app icon, manifest and offline service worker
