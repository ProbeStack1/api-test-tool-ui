import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Copy, Maximize2, Terminal as TerminalIcon } from "lucide-react";

type Line =
  | { type: "prompt"; text: string }
  | { type: "out"; text: string; tone?: "ok" | "warn" | "err" | "muted" }
  | { type: "json"; text: string }
  | { type: "status"; code: number; text: string; ms: number };

type Scene = {
  id: string;
  title: string;
  cwd: string;
  steps: Line[];
  response: {
    code: number;
    text: string;
    ms: number;
    method: string;
    path: string;
    body: { key: string; value: string; kind?: "num" | "str" }[];
  };
};

const SCENES: Scene[] = [
  {
    id: "curl",
    title: "GET /api/v1/users",
    cwd: "~/forgefuzz/collections",
    steps: [
      { type: "prompt", text: "curl -s https://api.forgefuzz.dev/v1/users?limit=2 \\\n  -H 'Authorization: Bearer $FORGEFUZZ_TOKEN'" },
      { type: "status", code: 200, text: "OK", ms: 142 },
      { type: "json", text: '[{ "id":"u_01H", "name":"Aanya Rao", "plan":"team" },\n { "id":"u_02H", "name":"Marc Olsen", "plan":"pro" }]' },
    ],
    response: {
      code: 200, text: "OK", ms: 142, method: "GET", path: "/v1/users",
      body: [
        { key: "users", value: "2", kind: "num" },
        { key: "region", value: '"eu-west"', kind: "str" },
      ],
    },
  },
  {
    id: "mock",
    title: "POST /v1/mocks",
    cwd: "~/forgefuzz/mocks",
    steps: [
      { type: "prompt", text: "forgefuzz mocks create --spec ./openapi.yaml \\\n  --name 'checkout-v2' --latency 47ms" },
      { type: "out", text: "✓ Parsed OpenAPI 3.1 (24 routes)", tone: "ok" },
      { type: "out", text: "✓ Spawning hosted mock in eu-west-1...", tone: "muted" },
      { type: "status", code: 201, text: "Created", ms: 318 },
      { type: "json", text: '{ "url":"https://mock.forgefuzz.io/checkout-v2",\n  "p95":"47ms", "uptime":"99.99%" }' },
    ],
    response: {
      code: 201, text: "Created", ms: 318, method: "POST", path: "/v1/mocks",
      body: [
        { key: "routes", value: "24", kind: "num" },
        { key: "p95", value: '"47ms"', kind: "str" },
      ],
    },
  },
  {
    id: "load",
    title: "Load test · 500 VU",
    cwd: "~/forgefuzz/load",
    steps: [
      { type: "prompt", text: "forgefuzz load run --scenario spike --vu 500 --duration 60s" },
      { type: "out", text: "→ Ramping VUs   [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░] 320 / 500", tone: "warn" },
      { type: "out", text: "→ p50  68ms   p95  214ms   p99  391ms", tone: "muted" },
      { type: "out", text: "→ rps  4 217   errors  0.02%   ok ✓", tone: "ok" },
      { type: "status", code: 200, text: "Run finished · 60s", ms: 60021 },
    ],
    response: {
      code: 200, text: "Run OK", ms: 60021, method: "RUN", path: "spike · 500vu",
      body: [
        { key: "rps", value: "4217", kind: "num" },
        { key: "errors", value: '"0.02%"', kind: "str" },
      ],
    },
  },
  {
    id: "sec",
    title: "Security · OWASP",
    cwd: "~/forgefuzz/security",
    steps: [
      { type: "prompt", text: "forgefuzz security scan --target collections/billing --owasp api-top10" },
      { type: "out", text: "▸ BOLA          24 endpoints scanned", tone: "muted" },
      { type: "out", text: "▸ Mass assign.  18 endpoints scanned", tone: "muted" },
      { type: "out", text: "! 2 high-severity findings · 1 medium", tone: "err" },
      { type: "json", text: '{ "high":2, "medium":1, "low":4, "report":"sec_4f8a" }' },
    ],
    response: {
      code: 422, text: "Findings", ms: 1872, method: "SCAN", path: "owasp · api-top10",
      body: [
        { key: "high", value: "2", kind: "num" },
        { key: "medium", value: "1", kind: "num" },
      ],
    },
  },
  {
    id: "monitor",
    title: "Monitor · multi-region",
    cwd: "~/forgefuzz/monitors",
    steps: [
      { type: "prompt", text: "forgefuzz monitors deploy --regions us-east,eu-west,ap-south" },
      { type: "out", text: "us-east-1   ● up   p95 88ms", tone: "ok" },
      { type: "out", text: "eu-west-1   ● up   p95 124ms", tone: "ok" },
      { type: "out", text: "ap-south-1  ● up   p95 196ms", tone: "ok" },
      { type: "status", code: 200, text: "3 probes scheduled", ms: 612 },
    ],
    response: {
      code: 200, text: "Deployed", ms: 612, method: "MON", path: "3 regions",
      body: [
        { key: "probes", value: "3", kind: "num" },
        { key: "p95_max", value: '"196ms"', kind: "str" },
      ],
    },
  },
];

function useTypewriter(scene: Scene) {
  const [rendered, setRendered] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");
  const [phase, setPhase] = useState<"typing" | "done">("typing");

  useEffect(() => {
    setRendered([]);
    setTyping("");
    setPhase("typing");

    let cancelled = false;
    let charIdx = 0;
    let stepIdx = 0;
    const out: Line[] = [];

    const playStep = () => {
      if (cancelled || stepIdx >= scene.steps.length) {
        if (!cancelled) setPhase("done");
        return;
      }
      const step = scene.steps[stepIdx];
      if (step.type === "prompt") {
        charIdx = 0;
        const tick = () => {
          if (cancelled) return;
          charIdx++;
          setTyping(step.text.slice(0, charIdx));
          if (charIdx < step.text.length) {
            setTimeout(tick, 14 + Math.random() * 22);
          } else {
            out.push(step);
            setRendered([...out]);
            setTyping("");
            stepIdx++;
            setTimeout(playStep, 320);
          }
        };
        tick();
      } else {
        out.push(step);
        setRendered([...out]);
        stepIdx++;
        setTimeout(playStep, 380);
      }
    };

    const start = setTimeout(playStep, 220);
    return () => { cancelled = true; clearTimeout(start); };
  }, [scene]);

  return { rendered, typing, phase };
}

export default function AnimatedTerminal() {
  const [idx, setIdx] = useState(0);
  const scene = SCENES[idx];
  const { rendered, typing, phase } = useTypewriter(scene);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % SCENES.length), 2400);
    return () => clearTimeout(t);
  }, [phase]);

  const [shift, setShift] = useState(0);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const inner = el.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const overflow = inner.scrollHeight - el.clientHeight;
    setShift(overflow > 0 ? overflow : 0);
  }, [rendered, typing, scene]);

  const tabBar = useMemo(
    () => SCENES.map((s, i) => ({ ...s, active: i === idx })),
    [idx],
  );

  // Live response card derives from the last emitted status/json line.
  const liveResponse = useMemo(() => {
    const lastStatus = [...rendered].reverse().find((l) => l.type === "status") as
      | Extract<Line, { type: "status" }>
      | undefined;
    return {
      ...scene.response,
      code: lastStatus?.code ?? scene.response.code,
      text: lastStatus?.text ?? scene.response.text,
      ms: lastStatus?.ms ?? scene.response.ms,
      ready: !!lastStatus,
    };
  }, [rendered, scene]);

  return (
    <div className="relative terminal-root">
      {/* Glow */}
      <div className="absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-br from-[var(--color-primary)]/20 via-transparent to-[var(--color-success)]/20 blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-border bg-[#0a0c11] shadow-[0_30px_80px_-20px_rgba(0,0,0,.5)]">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-border bg-[#13161d] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <div className="ml-3 flex items-center gap-1.5 text-[11px] text-text-muted">
              <TerminalIcon className="h-3 w-3" />
              <span className="font-mono">forgefuzz — zsh</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-text-muted">
            <Copy className="h-3.5 w-3.5 cursor-pointer hover:text-text-primary" />
            <Maximize2 className="h-3.5 w-3.5 cursor-pointer hover:text-text-primary" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-[#13161d] px-2 py-1.5 text-[11px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabBar.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setIdx(i)}
              className={`shrink-0 rounded-md px-2.5 py-1 font-mono transition ${
                t.active
                  ? "bg-[color:var(--text-primary)]/10 text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${t.active ? "bg-[var(--color-success)] animate-pulse-glow" : "bg-[color:var(--text-muted)]/40"}`} />
              {t.title}
            </button>
          ))}
        </div>

        {/* Body */}
<div
  ref={bodyRef}
  className="relative h-[200px] sm:h-[340px] overflow-hidden bg-[#0a0c11] px-4 py-3 font-mono text-[12.5px] leading-relaxed"
>
          <div
            className="will-change-transform transition-transform duration-300 ease-out"
            style={{ transform: `translateY(-${shift}px)` }}
          >
            <div className="text-text-muted">forgefuzz · {scene.cwd}</div>
            {rendered.map((l, i) => (
              <LineRow key={i} line={l} />
            ))}
            {typing && (
              <div className="mt-1 whitespace-pre-wrap">
                <span className="text-[var(--color-success)]">➜</span>{" "}
                <span className="text-[var(--color-primary)]">forgefuzz</span>{" "}
                <span className="text-text-primary">{typing}</span>
                <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[var(--color-primary)] animate-blink" />
              </div>
            )}
            {!typing && phase === "done" && (
              <div className="mt-1">
                <span className="text-[var(--color-success)]">➜</span>{" "}
                <span className="text-text-muted">_</span>
                <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[var(--color-primary)] animate-blink" />
              </div>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-[#0a0c11] to-transparent" />
        </div>
      </div>

      {/* Floating live response card */}
      <div
        key={`${scene.id}-${liveResponse.code}-${liveResponse.ms}`}
        className="absolute -right-4 -bottom-6 hidden w-[244px] rounded-xl border border-border bg-[#13161d] p-3 shadow-[0_20px_40px_-10px_rgba(0,0,0,.4)] sm:block animate-rise"
      >
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              liveResponse.code < 400
                ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
                : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
            }`}
          >
            <Circle className="h-1.5 w-1.5 fill-current" />
            {liveResponse.ready ? `${liveResponse.code} ${liveResponse.text}` : "pending…"}
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            {liveResponse.ready ? `${liveResponse.ms.toLocaleString()} ms` : "—"}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-text-muted">
          <span className="rounded bg-[var(--color-primary)]/15 px-1.5 py-0.5 font-semibold text-[var(--color-primary)]">
            {liveResponse.method}
          </span>
          <span className="truncate text-text-secondary">{liveResponse.path}</span>
        </div>
        <div className="mt-2 font-mono text-[10.5px] leading-snug text-text-secondary">
          <span className="text-[var(--color-primary)]">res</span>.<span className="text-[var(--color-primary)]">json</span>({"{"}
          {liveResponse.body.map((b, i) => (
            <div key={b.key} className="pl-3">
              <span className="text-[var(--color-success)]">"{b.key}"</span>
              <span className="text-text-muted">: </span>
              <span className={b.kind === "num" ? "text-text-primary" : "text-text-primary"}>{b.value}</span>
              {i < liveResponse.body.length - 1 ? <span className="text-text-muted">,</span> : null}
            </div>
          ))}
          {"})"}
        </div>
      </div>
    </div>
  );
}

function LineRow({ line }: { line: Line }) {
  if (line.type === "prompt") {
    return (
      <div className="mt-1 whitespace-pre-wrap">
        <span className="text-[var(--color-success)]">➜</span>{" "}
        <span className="text-[var(--color-primary)]">forgefuzz</span>{" "}
        <span className="text-text-primary">{line.text}</span>
      </div>
    );
  }
  if (line.type === "out") {
    const toneColor =
      line.tone === "ok"
        ? "var(--color-success)"
        : line.tone === "warn"
        ? "var(--color-primary)"
        : line.tone === "err"
        ? "var(--color-primary)"
        : "var(--text-secondary)";
    return (
      <div className="whitespace-pre-wrap" style={{ color: toneColor }}>
        {line.text}
      </div>
    );
  }
  if (line.type === "status") {
    const ok = line.code < 400;
    return (
      <div className="my-1 flex items-center gap-2 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${
            ok
              ? "bg-[var(--color-success)]/15 text-[var(--color-success)]"
              : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
          }`}
        >
          {line.code} {line.text}
        </span>
        <span className="text-text-muted">{line.ms.toLocaleString()}ms</span>
      </div>
    );
  }
  return (
    <pre className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-surface-elevated p-2 text-[11.5px] text-text-primary">
      {line.text}
    </pre>
  );
}
