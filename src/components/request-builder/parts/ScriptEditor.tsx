/**
 * ScriptEditor — Monaco-based JS editor for Pre-request Scripts and Tests.
 *
 * The left panel holds the Monaco; the right panel offers a tiny, static
 * snippet library so users can quickly drop common recipes.
 */
import { MonacoEditor } from '@/components/editor/MonacoEditor';

type Kind = 'prerequest' | 'tests';

const SNIPPETS: Record<Kind, { title: string; body: string }[]> = {
  prerequest: [
    { title: 'Set environment variable',
      body: `pm.environment.set("variable_key", "variable_value");` },
    { title: 'Get environment variable',
      body: `pm.environment.get("variable_key");` },
    { title: 'Set a global variable',
      body: `pm.globals.set("variable_key", "variable_value");` },
    { title: 'Send a request',
      body:
`pm.sendRequest("https://postman-echo.com/get", (err, res) => {
  console.log(err ? err : res.json());
});`,
    },
  ],
  tests: [
    { title: 'Status code: 200',
      body: `pm.test("Status code is 200", () => pm.response.to.have.status(200));` },
    { title: 'Response time < 500ms',
      body: `pm.test("Fast response", () => pm.expect(pm.response.responseTime).to.be.below(500));` },
    { title: 'Response body: contains string',
      body: `pm.test("Body has token", () => pm.expect(pm.response.text()).to.include("token"));` },
    { title: 'JSON value equals',
      body:
`pm.test("User id matches", () => {
  const body = pm.response.json();
  pm.expect(body.id).to.eql(42);
});`,
    },
  ],
};

export const ScriptEditor = ({
  kind, value, onChange,
}: { kind: Kind; value: string; onChange: (v: string) => void }) => {
  const list = SNIPPETS[kind];
  return (
    <div data-testid={`script-editor-${kind}`} className="flex h-full min-h-[360px] gap-3">
      <div className="min-w-0 flex-1">
        <MonacoEditor
          value={value}
          onChange={onChange}
          language="javascript"
          testId={`script-monaco-${kind}`}
          aiCopilotIntent={kind === 'tests' ? 'tests' : 'pre-request'}
        />
      </div>
      <div className="w-56 shrink-0 space-y-1 overflow-auto rounded-md border border-border bg-surface/40 p-2">
        <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Snippets
        </div>
        {list.map((s) => (
          <button
            key={s.title}
            data-testid={`script-snippet-${s.title.replace(/\W+/g, '-').toLowerCase()}`}
            onClick={() => onChange((value ? value + '\n\n' : '') + s.body)}
            className="w-full rounded px-2 py-1.5 text-left text-[11px] text-text-secondary transition-colors hover:bg-hover hover:text-primary"
          >
            {s.title}
          </button>
        ))}
      </div>
    </div>
  );
};
