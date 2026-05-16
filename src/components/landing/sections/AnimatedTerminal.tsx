import { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Copy, Maximize2, Terminal as TerminalIcon } from "lucide-react";

type Line =
  | { type: "prompt"; text: string }
  | { type: "out"; text: string; color?: string }
  | { type: "json"; text: string }
  | { type: "status"; code: number; text: string; ms: number };

type Scene = {
  id: string;
  title: string;
  cwd: string;
  steps: Line[];
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
  },
  {
    id: "mock",
    title: "POST /v1/mocks",
    cwd: "~/forgefuzz/mocks",
    steps: [
      { type: "prompt", text: "forgefuzz mocks create --spec ./openapi.yaml \\\n  --name 'checkout-v2' --latency 47ms" },
      { type: "out", text: "✓ Parsed OpenAPI 3.1 (24 routes)", color: "#1fbf9a" },
      { type: "out", text: "✓ Spawning hosted mock in eu-west-1...", color: "#a8adb8" },
      { type: "status", code: 201, text: "Created", ms: 318 },
      { type: "json", text: '{ "url":"https://mock.forgefuzz.io/checkout-v2",\n  "p95":"47ms", "uptime":"99.99%" }' },
    ],
  },
  {
    id: "load",
    title: "Load test · 500 VU",
    cwd: "~/forgefuzz/load",
    steps: [
      { type: "prompt", text: "forgefuzz load run --scenario spike --vu 500 --duration 60s" },
      { type: "out", text: "→ Ramping VUs   [▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░] 320 / 500", color: "#ffb400" },
      { type: "out", text: "→ p50  68ms   p95  214ms   p99  391ms", color: "#a8adb8" },
      { type: "out", text: "→ rps  4 217   errors  0.02%   ok ✓", color: "#1fbf9a" },
      { type: "status", code: 200, text: "Run finished · 60s", ms: 60_021 },
    ],
  },
  {
    id: "sec",
    title: "Security · OWASP",
    cwd: "~/forgefuzz/security",
    steps: [
      { type: "prompt", text: "forgefuzz security scan --target collections/billing --owasp api-top10" },
      { type: "out", text: "▸ BOLA          24 endpoints scanned", color: "#a8adb8" },
      { type: "out", text: "▸ Mass assign.  18 endpoints scanned", color: "#a8adb8" },
      { type: "out", text: "! 2 high-severity findings · 1 medium", color: "#ff5b1f" },
      { type: "json", text: '{ "high":2, "medium":1, "low":4, "report":"sec_4f8a" }' },
    ],
  },
  {
    id: "monitor",
    title: "Monitor · multi-region",
    cwd: "~/forgefuzz/monitors",
    steps: [
      { type: "prompt", text: "forgefuzz monitors deploy --regions us-east,eu-west,ap-south" },
      { type: "out", text: "us-east-1   ● up   p95 88ms", color: "#1fbf9a" },
      { type: "out", text: "eu-west-1   ● up   p95 124ms", color: "#1fbf9a" },
      { type: "out", text: "ap-south-1  ● up   p95 196ms", color: "#1fbf9a" },
      { type: "status", code: 200, text: "3 probes scheduled", ms: 612 },
    ],
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
            setTimeout(tick, 14 + Math.random() * 30);
          } else {
            out.push(step);
            setRendered([...out]);
            setTyping("");
            stepIdx++;
            setTimeout(playStep, 350);
          }
        };
        tick();
      } else {
        out.push(step);
        setRendered([...out]);
        stepIdx++;
        setTimeout(playStep, 420);
      }
    };

    const start = setTimeout(playStep, 250);
    return () => { cancelled = true; clearTimeout(start); };
  }, [scene]);

  return { rendered, typing, phase };
}

export default function AnimatedTerminal() {
  const [idx, setIdx] = useState(0);
  const scene = SCENES[idx];
  const { rendered, typing, phase } = useTypewriter(scene);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // auto-advance to next scene
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setIdx((i) => (i + 1) % SCENES.length), 2400);
    return () => clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [rendered, typing]);

  const tabBar = useMemo(
    () => SCENES.map((s, i) => ({ ...s, active: i === idx })),
    [idx],
  );

  return (
    <div className="relative">
      {/* Glow */}
      <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-[#ff5b1f]/20 via-transparent to-[#1fbf9a]/20 blur-2xl" />

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c11] shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)]">
        {/* Title bar */}
        <div className="flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent px-4 py-2.5">
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
            <Copy className="h-3.5 w-3.5 cursor-pointer hover:text-white" />
            <Maximize2 className="h-3.5 w-3.5 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-white/5 bg-white/[0.015] px-2 py-1.5 text-[11px]">
          {tabBar.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setIdx(i)}
              className={`shrink-0 rounded-md px-2.5 py-1 font-mono transition ${
                t.active
                  ? "bg-white/10 text-white"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${t.active ? "bg-[#1fbf9a] animate-pulse-glow" : "bg-white/20"}`} />
              {t.title}
            </button>
          ))}
        </div>

        {/* Body */}
        <div
          ref={scrollRef}
          className="relative h-[340px] overflow-y-auto bg-[#0a0c11] px-4 py-3 font-mono text-[12.5px] leading-relaxed"
        >
          <div className="pointer-events-none absolute inset-0 opacity-[.04]"
            style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.6) 0 1px, transparent 1px 3px)" }}
          />
          <div className="text-text-muted">forgefuzz · {scene.cwd}</div>
          {rendered.map((l, i) => (
            <LineRow key={i} line={l} />
          ))}
          {typing && (
            <div className="mt-1 whitespace-pre-wrap">
              <span className="text-[#1fbf9a]">➜</span>{" "}
              <span className="text-[#ffb400]">forgefuzz</span>{" "}
              <span className="text-white">{typing}</span>
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[#ff5b1f] animate-blink" />
            </div>
          )}
          {!typing && phase === "done" && (
            <div className="mt-1">
              <span className="text-[#1fbf9a]">➜</span>{" "}
              <span className="text-text-muted">_</span>
              <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-[#ff5b1f] animate-blink" />
            </div>
          )}
        </div>
      </div>

      {/* Floating response card */}
      <div className="absolute -right-4 -bottom-6 hidden w-[230px] rounded-xl border border-white/10 bg-[#13161d]/95 p-3 backdrop-blur-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,.6)] sm:block animate-rise">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1fbf9a]/15 px-2 py-0.5 text-[10px] font-semibold text-[#1fbf9a]">
            <Circle className="h-1.5 w-1.5 fill-current" /> 200 OK
          </span>
          <span className="font-mono text-[10px] text-text-muted">142 ms</span>
        </div>
        <div className="mt-2 font-mono text-[10.5px] leading-snug text-text-secondary">
          <span className="text-[#ffb400]">res</span>.<span className="text-[#ff8c4a]">json</span>(<br/>
          &nbsp;&nbsp;<span className="text-[#1fbf9a]">"users"</span>: <span className="text-white">2</span>,<br/>
          &nbsp;&nbsp;<span className="text-[#1fbf9a]">"region"</span>: <span className="text-white">"eu-west"</span><br/>
          )
        </div>
      </div>
    </div>
  );
}

function LineRow({ line }: { line: Line }) {
  if (line.type === "prompt") {
    return (
      <div className="mt-1 whitespace-pre-wrap">
        <span className="text-[#1fbf9a]">➜</span>{" "}
        <span className="text-[#ffb400]">forgefuzz</span>{" "}
        <span className="text-white">{line.text}</span>
      </div>
    );
  }
  if (line.type === "out") {
    return (
      <div className="whitespace-pre-wrap" style={{ color: line.color || "var(--text-secondary)" }}>
        {line.text}
      </div>
    );
  }
  if (line.type === "status") {
    const ok = line.code < 400;
    return (
      <div className="my-1 flex items-center gap-2 text-[11px]">
        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-semibold ${ok ? "bg-[#1fbf9a]/15 text-[#1fbf9a]" : "bg-[#ff5b1f]/15 text-[#ff5b1f]"}`}>
          {line.code} {line.text}
        </span>
        <span className="text-text-muted">{line.ms.toLocaleString()}ms</span>
      </div>
    );
  }
  return (
    <pre className="mt-1 whitespace-pre-wrap rounded-md border border-white/5 bg-white/[0.02] p-2 text-[11.5px] text-[#cfd3dc]">
      {line.text}
    </pre>
  );
}
