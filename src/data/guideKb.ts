/**
 * In-app knowledge base for the floating chatbot's "guide mode".
 *
 * Each topic gets a title, a short description, ordered steps, an
 * optional route to deep-link the user to, and related-topic ids for
 * the "Related guides" chips. Keep entries short — the digest is sent
 * to Gemini as system context.
 */
import type { ComponentType } from 'react';
import {
  Folder, FolderOpen, Send, Globe, Variable, Beaker, Layers, Bell,
  Webhook, Sparkles, Trash, Settings, ShieldCheck, Activity, History,
} from 'lucide-react';

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  route?: string;
  related?: string[];
  /** Search keywords (free-form). */
  keywords?: string[];
}

export interface GuideCategory {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  topics: GuideTopic[];
}

export const GUIDE_KB: GuideCategory[] = [
  {
    id: 'projects', label: 'Projects', icon: Folder,
    topics: [
      {
        id: 'create-project',
        title: 'Create a project',
        summary: 'A project is the top-level container for collections, environments, and members.',
        steps: [
          'Open the right rail and click the Project icon.',
          'Click the "+ Create" button at the top of the projects panel.',
          'Give the project a name, choose visibility (Private / Workspace / Public), then Save.',
          'The new project becomes active automatically.',
        ],
        route: '/project',
        related: ['create-collection', 'invite-members'],
        keywords: ['workspace', 'create', 'new project', 'add'],
      },
      {
        id: 'invite-members',
        title: 'Invite members to a project',
        summary: 'Add teammates with Owner / Editor / Viewer roles.',
        steps: [
          'Open the Project detail page from the right rail.',
          'Switch to the Members tab.',
          'Enter an email and pick a role.',
          'Click Send invite — they\'ll receive an email link.',
        ],
        route: '/project',
        related: ['create-project'],
        keywords: ['invite', 'team', 'member', 'role', 'collaborator'],
      },
    ],
  },
  {
    id: 'collections', label: 'Collections & Requests', icon: FolderOpen,
    topics: [
      {
        id: 'create-collection',
        title: 'Create a collection',
        summary: 'Collections group related requests inside a project. You need a project first.',
        steps: [
          'Make sure a project is active (right-rail Project tab).',
          'Open the Collections tab from the left feature rail.',
          'Click "+ Collection" at the top of the panel.',
          'Name the collection — folders and requests go inside it.',
        ],
        route: '/projects/collections',
        related: ['create-request', 'create-project'],
        keywords: ['collection', 'folder', 'group', 'organize'],
      },
      {
        id: 'create-request',
        title: 'Create a request',
        summary: 'Requests live inside collections (or folders inside collections).',
        steps: [
          'Open the Collections tab.',
          'Hover the collection where you want the request → click the kebab → New request.',
          'Pick a method (GET/POST/…), enter the URL, set headers, params, body as needed.',
          'Click Send to execute, or Save to persist it inside the collection.',
        ],
        route: '/projects/collections',
        related: ['create-collection', 'send-request', 'environment-vars'],
        keywords: ['request', 'http', 'api', 'endpoint', 'send'],
      },
      {
        id: 'send-request',
        title: 'Send a request and inspect the response',
        summary: 'Hit Send to execute, then explore the response panel.',
        steps: [
          'Open any request from a collection.',
          'Click Send. The response opens at the bottom: status, time, size, body, headers, cookies, tests.',
          'Use the Code Snippet tab on the right rail to copy the request as cURL / fetch / Python / etc.',
          'Use the AI tab on the right rail to ask the assistant about the request or response.',
        ],
        route: '/projects/collections',
        related: ['create-request', 'code-snippet', 'right-sidebar-ai'],
        keywords: ['send', 'execute', 'response', 'test'],
      },
    ],
  },
  {
    id: 'env', label: 'Environments & Variables', icon: Variable,
    topics: [
      {
        id: 'environment-vars',
        title: 'Use environment variables',
        summary: 'Store URLs, API keys, and secrets per environment (dev/staging/prod). Reference with `{{key}}`.',
        steps: [
          'Open the Variables tab from the left feature rail.',
          'Click "+ Environment" to create one (e.g. "dev"). Add key/value pairs.',
          'In the request URL, headers, or body, type `{{apiKey}}` to reference a variable.',
          'Pick the active environment from the header dropdown.',
        ],
        route: '/projects/variables',
        related: ['create-request'],
        keywords: ['variables', 'env', 'environment', 'secret', 'token', 'apikey'],
      },
    ],
  },
  {
    id: 'mocks', label: 'Mocks', icon: Globe,
    topics: [
      {
        id: 'create-mock',
        title: 'Create a mock server',
        summary: 'Spin up a fake API for frontend development before the real backend is ready.',
        steps: [
          'Open the Mocks tab from the left feature rail.',
          'Click "+ Mock", give it a name, attach a collection.',
          'Each request in the collection becomes a mock route returning saved example responses.',
          'Use the generated mock URL in your client app.',
        ],
        route: '/projects/mocks',
        related: ['create-collection'],
        keywords: ['mock', 'fake api', 'stub', 'example'],
      },
    ],
  },
  {
    id: 'testing', label: 'Testing & Load tests', icon: Beaker,
    topics: [
      {
        id: 'create-test-spec',
        title: 'Add test assertions to a request',
        summary: 'Use the Tests tab inside a request to write JS assertions that run after each Send.',
        steps: [
          'Open a request and switch to the Tests tab.',
          'Use the snippet sidebar to insert common assertions (status code, header check, body schema).',
          'Hit Send — assertion results appear at the bottom of the response panel.',
        ],
        related: ['send-request'],
        keywords: ['test', 'assertion', 'pm.test', 'expect'],
      },
      {
        id: 'load-test',
        title: 'Run a load test',
        summary: 'Stress-test an endpoint with concurrent virtual users.',
        steps: [
          'Open the Testing tab on the left rail.',
          'Pick a request or collection, set virtual users + duration.',
          'Click Run — watch p50/p95 latency and throughput live.',
        ],
        route: '/projects/testing',
        related: ['create-request'],
        keywords: ['load', 'stress', 'performance', 'k6'],
      },
    ],
  },
  {
    id: 'monitors', label: 'Monitors & Heartbeats', icon: Activity,
    topics: [
      {
        id: 'create-monitor',
        title: 'Set up a monitor',
        summary: 'Schedule a request or collection to run periodically and alert on failures.',
        steps: [
          'Visit the Monitor Hub at /projects/monitors.',
          'Click "+ Monitor", attach a collection, set a cadence (every 5/15/60 min).',
          'Configure notification channels (email / Slack webhook).',
          'A failing run flips the public status page red and notifies subscribers.',
        ],
        route: '/projects/monitors',
        related: ['integrations'],
        keywords: ['monitor', 'schedule', 'cron', 'alert', 'uptime'],
      },
    ],
  },
  {
    id: 'integrations', label: 'Webhook integrations', icon: Webhook,
    topics: [
      {
        id: 'integrations',
        title: 'Wire a webhook integration',
        summary: 'Forward run events / monitor failures to Slack, Discord, or any webhook URL.',
        steps: [
          'Open Integrations from /projects/integrations.',
          'Click "+ Webhook", paste the destination URL (Slack/Discord/webhook.site).',
          'Pick the event types to forward.',
          'Test it with the Replay drawer to confirm the payload looks right.',
        ],
        route: '/projects/integrations',
        related: ['create-monitor'],
        keywords: ['webhook', 'slack', 'discord', 'integrations', 'notify'],
      },
    ],
  },
  {
    id: 'ai', label: 'AI features', icon: Sparkles,
    topics: [
      {
        id: 'right-sidebar-ai',
        title: 'Ask the AI about the current request',
        summary: 'The right sidebar AI tab is scoped to whatever request you have open.',
        steps: [
          'Open any request.',
          'Click the AI icon on the far-right rail.',
          'Type a question like "Why am I getting 401?" — it sees the method, URL, headers, body, and last response.',
          'Conversation resets when you switch to a different request.',
        ],
        keywords: ['ai', 'right sidebar', 'analyze', 'inline'],
      },
      {
        id: 'ai-assisted',
        title: 'Use the AI Assisted tab',
        summary: 'Dedicated multi-session chat with the AI — like a mini ChatGPT inside ForgeQ.',
        steps: [
          'Click the Sparkles icon in the left feature rail (AI Assisted).',
          'Start typing immediately — first send auto-creates a session.',
          'Use "+ New chat" in the sidebar to start a fresh conversation.',
          'Hover any chat to rename or move it to Trash.',
        ],
        route: '/projects/ai-assisted',
        related: ['right-sidebar-ai'],
        keywords: ['ai assisted', 'chat', 'multi session', 'history'],
      },
      {
        id: 'code-snippet',
        title: 'Generate a code snippet for the active request',
        summary: 'Convert any request into cURL / fetch / Python / Java / HTTPie code.',
        steps: [
          'Open a request, click the </> Snippet icon on the far-right rail.',
          'Pick a target language from the dropdown.',
          'Toggle the gear icon to switch between `{{var}}` placeholders and resolved actual values.',
          'Click the Copy button.',
        ],
        keywords: ['snippet', 'curl', 'code', 'export'],
      },
    ],
  },
  {
    id: 'trash', label: 'Trash & restore', icon: Trash,
    topics: [
      {
        id: 'restore-from-trash',
        title: 'Restore something from Trash',
        summary: 'Deleted collections, requests, and chats sit in Trash for the retention window.',
        steps: [
          'Open the Trash tab (left feature rail).',
          'Hover an item → click the Restore icon to move it back, or the Trash icon to delete permanently.',
        ],
        route: '/projects/trash',
        keywords: ['trash', 'restore', 'undo', 'delete'],
      },
    ],
  },
];

/** Compact markdown digest sent to the backend as system context. */
export const buildKbDigest = (): string => {
  const lines: string[] = [];
  for (const cat of GUIDE_KB) {
    lines.push(`## ${cat.label}`);
    for (const t of cat.topics) {
      lines.push(`- **${t.title}** (${t.id}): ${t.summary}`);
      if (t.route) lines.push(`  Route: \`${t.route}\``);
    }
  }
  return lines.join('\n');
};

/** Flatten + simple keyword/text-match search. */
export const searchTopics = (q: string): GuideTopic[] => {
  if (!q.trim()) return GUIDE_KB.flatMap((c) => c.topics);
  const needle = q.toLowerCase();
  const score = (t: GuideTopic): number => {
    let s = 0;
    if (t.title.toLowerCase().includes(needle)) s += 5;
    if (t.summary.toLowerCase().includes(needle)) s += 2;
    for (const k of t.keywords ?? []) if (k.includes(needle)) s += 3;
    return s;
  };
  return GUIDE_KB.flatMap((c) => c.topics)
    .map((t) => ({ t, s: score(t) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ t }) => t);
};

export const findTopic = (id: string): GuideTopic | undefined =>
  GUIDE_KB.flatMap((c) => c.topics).find((t) => t.id === id);
