/**
 * AuthEditor — Postman-parity authorization panel.
 *
 * Layout:
 *   ┌ Type dropdown ┐   ┌ Right-side config for the selected type ┐
 *   │ No Auth       │   │ <fields…>                                 │
 *   │ API Key       │   │                                            │
 *   │ Bearer Token  │   │                                            │
 *   │ Basic Auth    │   │                                            │
 *   │ Digest Auth   │   │                                            │
 *   │ OAuth 1.0     │   │                                            │
 *   │ OAuth 2.0     │   │                                            │
 *   │ Hawk          │   │                                            │
 *   │ AWS Signature │   │                                            │
 *   │ NTLM          │   │                                            │
 *   │ Inherit auth  │   │                                            │
 *   └───────────────┘   └────────────────────────────────────────────┘
 *
 * Every free-text field uses VariableInput so `{{vars}}` work everywhere.
 * The blue info banner explains what gets generated on-the-wire.
 */
import { Info } from 'lucide-react';
import { VariableInput } from '@/components/ui/VariableInput';
import { Select as UISelect } from '@/components/ui/Select';
import { cn } from '@/utils/cn';

export type AuthType =
  | 'noauth'      | 'apikey'      | 'bearer'
  | 'basic'       | 'digest'      | 'oauth1'
  | 'oauth2'      | 'hawk'        | 'awsv4'
  | 'ntlm'        | 'inherit';

export interface AuthConfig {
  type: AuthType;
  config: Record<string, any>;
}

const TYPES: { key: AuthType; label: string; hint: string }[] = [
  { key: 'noauth',  label: 'No Auth',         hint: 'Authorization header will be automatically generated.' },
  { key: 'inherit', label: 'Inherit auth from parent', hint: 'This request will inherit the auth set on its folder/collection.' },
  { key: 'apikey',  label: 'API Key',         hint: 'Send as header or query param.' },
  { key: 'bearer',  label: 'Bearer Token',    hint: 'Authorization: Bearer <token>' },
  { key: 'basic',   label: 'Basic Auth',      hint: 'Authorization: Basic <base64(user:pass)>' },
  { key: 'digest',  label: 'Digest Auth',     hint: 'HTTP Digest Authentication.' },
  { key: 'oauth1',  label: 'OAuth 1.0',       hint: 'OAuth 1.0 signed request.' },
  { key: 'oauth2',  label: 'OAuth 2.0',       hint: 'Uses a previously acquired access token.' },
  { key: 'hawk',    label: 'Hawk Auth',       hint: 'Hawk HTTP authentication scheme.' },
  { key: 'awsv4',   label: 'AWS Signature',   hint: 'SigV4 for AWS APIs.' },
  { key: 'ntlm',    label: 'NTLM',            hint: 'Windows-domain NTLM authentication.' },
];

export const AuthEditor = ({
  value, onChange,
}: {
  value: AuthConfig;
  onChange: (v: AuthConfig) => void;
}) => {
  const spec = TYPES.find((t) => t.key === value.type) ?? TYPES[0];
  const set = (patch: Record<string, any>) => onChange({ ...value, config: { ...value.config, ...patch } });

  return (
    <div data-testid="auth-editor" className="grid grid-cols-[220px_1fr] gap-5">
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-text-muted">Type</label>
        <UISelect
          testId="auth-type"
          value={value.type}
          onChange={(v) => onChange({ type: v as AuthType, config: {} })}
          options={TYPES.map((t) => ({ value: t.key, label: t.label }))}
          className="h-9 w-full"
        />

        <div className="mt-4 flex items-start gap-2 rounded-md border border-border bg-surface/40 p-3 text-[11px] text-text-secondary">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{spec.hint}</span>
        </div>
      </div>

      <div>
        {value.type === 'noauth' && (
          <div data-testid="auth-empty" className="rounded-md border border-dashed border-border p-6 text-center text-xs italic text-text-muted">
            No authorization configured.
          </div>
        )}
        {value.type === 'inherit' && (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-xs italic text-text-muted">
            Inheriting from the parent folder/collection.
          </div>
        )}
        {value.type === 'apikey'  && <ApiKeyFields   cfg={value.config} set={set} />}
        {value.type === 'bearer'  && <BearerFields   cfg={value.config} set={set} />}
        {value.type === 'basic'   && <BasicFields    cfg={value.config} set={set} />}
        {value.type === 'digest'  && <DigestFields   cfg={value.config} set={set} />}
        {value.type === 'oauth1'  && <OAuth1Fields   cfg={value.config} set={set} />}
        {value.type === 'oauth2'  && <OAuth2Fields   cfg={value.config} set={set} />}
        {value.type === 'hawk'    && <HawkFields     cfg={value.config} set={set} />}
        {value.type === 'awsv4'   && <AwsFields      cfg={value.config} set={set} />}
        {value.type === 'ntlm'    && <NtlmFields     cfg={value.config} set={set} />}
      </div>
    </div>
  );
};

/* ───── small labelled VariableInput ───── */
const Field = ({ label, value, onChange, placeholder, testId }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; testId?: string;
}) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-1.5">
    <label className="text-xs text-text-secondary">{label}</label>
    <VariableInput value={value || ''} onChange={onChange} placeholder={placeholder} testId={testId} mode="boxed" />
  </div>
);
const Select = ({ label, value, onChange, options, testId }: {
  label: string; value: string; onChange: (v: string) => void; options: { k: string; l: string }[]; testId?: string;
}) => (
  <div className="grid grid-cols-[140px_1fr] items-center gap-3 py-1.5">
    <label className="text-xs text-text-secondary">{label}</label>
    <UISelect
      testId={testId}
      value={value}
      onChange={onChange}
      options={options.map((o) => ({ value: o.k, label: o.l }))}
      className="h-9 w-full"
    />
  </div>
);

/* ───── per-type field clusters ───── */
const ApiKeyFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Key" value={cfg.key} onChange={(v) => set({ key: v })} testId="ak-key" />
    <Field label="Value" value={cfg.value} onChange={(v) => set({ value: v })} testId="ak-val" />
    <Select label="Add to" value={cfg.addTo || 'header'} onChange={(v) => set({ addTo: v })}
      options={[{ k: 'header', l: 'Header' }, { k: 'query', l: 'Query Params' }]} testId="ak-in" />
  </div>
);
const BearerFields = ({ cfg, set }: any) => (
  <Field label="Token" value={cfg.token} onChange={(v) => set({ token: v })} placeholder="eyJhbGciOi…" testId="bearer-token" />
);
const BasicFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Username" value={cfg.username} onChange={(v) => set({ username: v })} testId="basic-user" />
    <Field label="Password" value={cfg.password} onChange={(v) => set({ password: v })} testId="basic-pass" />
  </div>
);
const DigestFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Username" value={cfg.username} onChange={(v) => set({ username: v })} testId="dig-user" />
    <Field label="Password" value={cfg.password} onChange={(v) => set({ password: v })} testId="dig-pass" />
    <Field label="Realm"    value={cfg.realm}    onChange={(v) => set({ realm: v })}    testId="dig-realm" />
    <Field label="Nonce"    value={cfg.nonce}    onChange={(v) => set({ nonce: v })}    testId="dig-nonce" />
    <Select label="Algorithm" value={cfg.algorithm || 'MD5'} onChange={(v) => set({ algorithm: v })}
      options={[{ k: 'MD5', l: 'MD5' }, { k: 'SHA-256', l: 'SHA-256' }]} />
  </div>
);
const OAuth1Fields = ({ cfg, set }: any) => (
  <div>
    <Field label="Consumer Key"    value={cfg.consumerKey}    onChange={(v) => set({ consumerKey: v })} />
    <Field label="Consumer Secret" value={cfg.consumerSecret} onChange={(v) => set({ consumerSecret: v })} />
    <Field label="Token"           value={cfg.token}          onChange={(v) => set({ token: v })} />
    <Field label="Token Secret"    value={cfg.tokenSecret}    onChange={(v) => set({ tokenSecret: v })} />
    <Select label="Signature" value={cfg.signature || 'HMAC-SHA1'} onChange={(v) => set({ signature: v })}
      options={[{ k: 'HMAC-SHA1', l: 'HMAC-SHA1' }, { k: 'HMAC-SHA256', l: 'HMAC-SHA256' }, { k: 'PLAINTEXT', l: 'PLAINTEXT' }]} />
  </div>
);
const OAuth2Fields = ({ cfg, set }: any) => (
  <div>
    <Field label="Access Token" value={cfg.accessToken} onChange={(v) => set({ accessToken: v })} testId="oauth2-token" />
    <Select label="Add to" value={cfg.addTo || 'header'} onChange={(v) => set({ addTo: v })}
      options={[{ k: 'header', l: 'Request Headers' }, { k: 'query', l: 'Request URL' }]} />
    <Field label="Header Prefix" value={cfg.headerPrefix || 'Bearer'} onChange={(v) => set({ headerPrefix: v })} />
  </div>
);
const HawkFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Hawk Auth ID"   value={cfg.authId}  onChange={(v) => set({ authId: v })} />
    <Field label="Hawk Auth Key"  value={cfg.authKey} onChange={(v) => set({ authKey: v })} />
    <Select label="Algorithm" value={cfg.algorithm || 'sha256'} onChange={(v) => set({ algorithm: v })}
      options={[{ k: 'sha256', l: 'sha256' }, { k: 'sha1', l: 'sha1' }]} />
  </div>
);
const AwsFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Access Key"     value={cfg.accessKey}    onChange={(v) => set({ accessKey: v })} testId="aws-ak" />
    <Field label="Secret Key"     value={cfg.secretKey}    onChange={(v) => set({ secretKey: v })} testId="aws-sk" />
    <Field label="AWS Region"     value={cfg.region}       onChange={(v) => set({ region: v })} placeholder="us-east-1" />
    <Field label="Service Name"   value={cfg.serviceName}  onChange={(v) => set({ serviceName: v })} placeholder="execute-api" />
    <Field label="Session Token"  value={cfg.sessionToken} onChange={(v) => set({ sessionToken: v })} />
  </div>
);
const NtlmFields = ({ cfg, set }: any) => (
  <div>
    <Field label="Username" value={cfg.username} onChange={(v) => set({ username: v })} />
    <Field label="Password" value={cfg.password} onChange={(v) => set({ password: v })} />
    <Field label="Domain"   value={cfg.domain}   onChange={(v) => set({ domain: v })} />
    <Field label="Workstation" value={cfg.workstation} onChange={(v) => set({ workstation: v })} />
  </div>
);

void cn; // explicit so tree-shaker keeps util graph clear
