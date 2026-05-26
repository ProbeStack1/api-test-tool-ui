import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Activity, Boxes, Gauge, Server, Workflow } from "lucide-react";

type Slide = {
  id: string;
  badge: string;
  title: string;
  desc: string;
  icon: any;
  render: () => React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    id: "collections",
    badge: "Slide 1 · Collection / Request Builder",
    title: "Postman-style 3-pane builder",
    desc: "Tree on the left, builder in the middle, response on the right. Real send → 200 OK in ~140 ms.",
    icon: Boxes,
    render: () => <CollectionsMock />,
  },
  {
    id: "mcp",
    badge: "Slide 2 · MCP Console",
    title: "Catalog + Tools / Resources / Audit",
    desc: "Inspect tools, replay calls, JSON-Diff between two responses (red / green lines).",
    icon: Workflow,
    render: () => <McpMock />,
  },
  {
    id: "mocks",
    badge: "Slide 3 · Hosted Mocks",
    title: "Visual route → live mock URL",
    desc: "Spin up a hosted mock from your spec. Public URL. p95 of 47 ms.",
    icon: Server,
    render: () => <MocksMock />,
  },
  {
    id: "load",
    badge: "Slide 4 · Tests + Load",
    title: "Functional steps · live SSE charts",
    desc: "Steps animate green; p50/p95/p99 stream live as the load test ramps.",
    icon: Gauge,
    render: () => <LoadMock />,
  },
  {
    id: "monitors",
    badge: "Slide 5 · Monitors + Dashboard",
    title: "Multi-region probes light up green",
    desc: "KPI tiles with sparklines + region map. Page on p95 breach.",
    icon: Activity,
    render: () => <MonitorsMock />,
  },
];

export default function ProductShowcase() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, []);

  const s = SLIDES[i];
  const Icon = s.icon;

  return (
    <section id="showcase" className="relative py-24 border-t border-white/5">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10 bg-[#0e1117]">
          <div className="grid lg:grid-cols-[280px_1fr]">
            {/* Tabs */}
            <div className="border-b border-white/5 lg:border-b-0 lg:border-r">
              <div className="flex overflow-x-auto p-2 lg:flex-col">
                {SLIDES.map((sl, idx) => {
                  const SI = sl.icon;
                  const active = idx === i;
                  return (
                    <button
                      key={sl.id}
                      onClick={() => setI(idx)}
                      className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-[13px] transition lg:whitespace-normal ${
                        active ? "bg-white/[0.06] text-white" : "text-text-secondary hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`grid h-7 w-7 place-items-center rounded-md ${active ? "gradient-bg" : "bg-white/5"}`}>
                        <SI className="h-3.5 w-3.5 text-white" />
                      </span>
                      <div className="hidden lg:block">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Slide {idx + 1}</div>
                        <div className="font-medium">{sl.title.split("·")[0]}</div>
                      </div>
                      <span className="lg:hidden">{sl.title.split("·")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage */}
            <div className="relative min-h-[420px] p-5 sm:p-7">
              <div className="mb-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  <Icon className="h-3.5 w-3.5 text-[#ffb400]" />
                  {s.badge}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setI((p) => (p - 1 + SLIDES.length) % SLIDES.length)} className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-text-secondary hover:text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setI((p) => (p + 1) % SLIDES.length)} className="grid h-8 w-8 place-items-center rounded-md border border-white/10 text-text-secondary hover:text-white">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-display text-2xl font-bold text-white">{s.title}</h3>
              <p className="mt-1.5 max-w-xl text-[13.5px] text-text-secondary">{s.desc}</p>

              <div key={s.id} className="mt-5 animate-rise">
                {s.render()}
              </div>

              {/* progress dots */}
              <div className="mt-5 flex gap-1.5">
                {SLIDES.map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all ${idx === i ? "w-10 gradient-bg" : "w-4 bg-white/10"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pane({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-[#13161d]/80 p-3">
      {title && <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">{title}</div>}
      {children}
    </div>
  );
}

function CollectionsMock() {
  const tree = [
    { name: "auth", items: ["POST /login", "POST /refresh"] },
    { name: "users", items: ["GET /users", "GET /users/:id", "POST /users"] },
    { name: "billing", items: ["POST /charge", "GET /invoices"] },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-[180px_1fr_200px]">
      <Pane title="Collections">
        <div className="space-y-2">
          {tree.map((g) => (
            <div key={g.name}>
              <div className="text-[11.5px] font-semibold text-white">{g.name}</div>
              <div className="ml-2 mt-1 space-y-1">
                {g.items.map((it) => (
                  <div key={it} className="font-mono text-[10.5px] text-text-secondary hover:text-white cursor-pointer">{it}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Pane>
      <Pane title="Request">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-[#1fbf9a]/15 px-2 py-1 text-[10.5px] font-semibold text-[#1fbf9a]">GET</span>
          <span className="font-mono text-[11px] text-white truncate">https://api.forgeq.dev/v1/users?limit=2</span>
        </div>
        <div className="mt-3 flex gap-1 text-[10.5px]">
          {["Params", "Auth", "Headers", "Body", "Tests"].map((t, i) => (
            <span key={t} className={`rounded px-2 py-1 ${i === 0 ? "bg-white/10 text-white" : "text-text-muted"}`}>{t}</span>
          ))}
        </div>
        <pre className="mt-3 rounded-md border border-white/5 bg-black/40 p-2 font-mono text-[10.5px] text-[#cfd3dc]">
{`{
  "limit": 2,
  "expand": ["plan"]
}`}
        </pre>
      </Pane>
      <Pane title="Response">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-[#1fbf9a]/15 px-2 py-0.5 text-[10.5px] font-semibold text-[#1fbf9a]">200 OK</span>
          <span className="font-mono text-[10.5px] text-text-muted">142ms</span>
        </div>
        <pre className="mt-2 rounded-md border border-white/5 bg-black/40 p-2 font-mono text-[10px] text-[#cfd3dc]">
{`[{"id":"u_1","plan":"team"},
 {"id":"u_2","plan":"pro"}]`}
        </pre>
      </Pane>
    </div>
  );
}

function McpMock() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pane title="Catalog · 32 servers">
        <div className="grid grid-cols-2 gap-2">
          {["GitHub", "Slack", "Stripe", "Salesforce", "OpenAI", "Notion"].map((s, i) => (
            <div key={s} className="rounded-md border border-white/5 bg-white/[0.02] p-2">
              <div className="flex items-center justify-between">
                <span className="text-[11.5px] font-semibold text-white">{s}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${i === 4 ? "bg-[#ffb400]" : "bg-[#1fbf9a]"} animate-pulse`} />
              </div>
              <div className="mt-1 text-[10px] text-text-muted">{8 + i * 3} tools</div>
            </div>
          ))}
        </div>
      </Pane>
      <Pane title="Audit · JSON Diff">
        <pre className="font-mono text-[10.5px] leading-relaxed">
<span style={{ color: "#a8adb8" }}>{` "user": "u_01H",
`}</span>
<span style={{ color: "#ef4444", background: "rgba(239,68,68,.08)" }}>{`-"plan": "free",
`}</span>
<span style={{ color: "#1fbf9a", background: "rgba(31,191,154,.08)" }}>{`+"plan": "team",
`}</span>
<span style={{ color: "#a8adb8" }}>{` "seats": 8,
 "region": "eu-west"`}</span>
        </pre>
      </Pane>
    </div>
  );
}

function MocksMock() {
  return (
    <Pane>
      <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
        <div>
          <div className="text-[11.5px] font-semibold text-white">Routes</div>
          <div className="mt-2 space-y-1.5">
            {[
              { m: "GET",  p: "/checkout/session" },
              { m: "POST", p: "/checkout/charge" },
              { m: "GET",  p: "/checkout/receipt/:id" },
            ].map((r) => (
              <div key={r.p} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
                <span className="rounded bg-[#ff5b1f]/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#ff5b1f]">{r.m}</span>
                <span className="font-mono text-[11px] text-white">{r.p}</span>
                <span className="ml-auto font-mono text-[10px] text-text-muted">47ms</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-white/5 bg-black/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Live mock URL</div>
          <div className="mt-1 font-mono text-[11px] text-[#1fbf9a] break-all">https://mock.forgeq.io/checkout-v2</div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <KPI label="p95" v="47ms" />
            <KPI label="rps" v="3.2k" />
            <KPI label="up" v="99.99%" />
          </div>
        </div>
      </div>
    </Pane>
  );
}

function KPI({ label, v }: { label: string; v: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/[0.02] py-1.5">
      <div className="font-mono text-[12px] font-bold text-white">{v}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}

function LoadMock() {
  const steps = ["Login", "Create cart", "Add item", "Checkout", "Receipt"];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pane title="Functional steps">
        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${i < 4 ? "bg-[#1fbf9a]/20 text-[#1fbf9a]" : "bg-white/5 text-text-muted"}`}>
                {i < 4 ? "✓" : i + 1}
              </span>
              <span className="text-[12px] text-white">{s}</span>
              <span className="ml-auto font-mono text-[10px] text-text-muted">{(60 + i * 35)}ms</span>
            </div>
          ))}
        </div>
      </Pane>
      <Pane title="Live · 500 VU">
        <div className="space-y-2">
          {[
            { n: "p50", v: 68, max: 200, c: "#1fbf9a" },
            { n: "p95", v: 214, max: 400, c: "#ffb400" },
            { n: "p99", v: 391, max: 600, c: "#ff5b1f" },
          ].map((m) => (
            <div key={m.n}>
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-text-muted">{m.n}</span>
                <span className="font-mono text-white">{m.v}ms</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(m.v / m.max) * 100}%`, background: m.c, animation: "count-bar 1.4s ease-out" }} />
              </div>
            </div>
          ))}
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <KPI label="rps" v="4.2k" />
            <KPI label="err" v="0.02%" />
            <KPI label="vu" v="500" />
          </div>
        </div>
      </Pane>
    </div>
  );
}

function MonitorsMock() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Pane title="Multi-region · live">
        <div className="space-y-2">
          {[
            { r: "us-east-1", p: 88 },
            { r: "eu-west-1", p: 124 },
            { r: "ap-south-1", p: 196 },
            { r: "sa-east-1", p: 248 },
          ].map((x) => (
            <div key={x.r} className="flex items-center gap-2 rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#1fbf9a] animate-pulse" />
              <span className="text-[11.5px] text-white">{x.r}</span>
              <span className="ml-auto font-mono text-[10.5px] text-text-muted">p95 {x.p}ms</span>
            </div>
          ))}
        </div>
      </Pane>
      <Pane title="Dashboard">
        <div className="grid grid-cols-2 gap-2">
          {[
            { l: "Pass-rate", v: "99.4%" },
            { l: "MTTR", v: "3m 12s" },
            { l: "Total runs", v: "12 481" },
            { l: "p95", v: "118ms" },
          ].map((k) => (
            <div key={k.l} className="rounded-md border border-white/5 bg-white/[0.02] p-2">
              <div className="text-[9.5px] uppercase tracking-wider text-text-muted">{k.l}</div>
              <div className="font-display text-base font-bold text-white">{k.v}</div>
              <Spark />
            </div>
          ))}
        </div>
      </Pane>
    </div>
  );
}

function Spark() {
  const pts = Array.from({ length: 14 }, (_, i) => `${i * 8},${20 - Math.sin(i * 0.7) * 6 - Math.random() * 4}`).join(" ");
  return (
    <svg viewBox="0 0 110 24" className="mt-1 h-5 w-full">
      <polyline points={pts} fill="none" stroke="#1fbf9a" strokeWidth="1.5" />
    </svg>
  );
}
