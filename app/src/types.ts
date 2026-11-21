export interface Agent {
  id: string;
  division: string;
  name: string;
  description: string;
  emoji: string;
  vibe: string;
  color: string;
  path: string;
  body: string;
}

export interface Division {
  id: string;
  label: string;
  color: string;
  count: number;
}

export interface AgentData {
  divisions: Division[];
  agents: Agent[];
}
