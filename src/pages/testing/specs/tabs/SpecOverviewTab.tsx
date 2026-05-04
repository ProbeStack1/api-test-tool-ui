/**
 * SpecOverviewTab — at-a-glance card grid for a test spec.
 * Pure presentation; reads from the `TestSpec` already fetched by the
 * parent so there's no extra network call.
 */
import {
  Hash, FileText, Database, Calendar, ListChecks, Tag, Globe, User,
} from 'lucide-react';
import { type TestSpec } from '@/services/testSpec.service';
import { FormatBadge, formatBytes, formatRelative } from '../../shared/Badges';

interface Props { spec: TestSpec }

export const SpecOverviewTab = ({ spec }: Props) => (
  <div className="space-y-4 p-6" data-testid="spec-overview-tab">
    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Identity
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card icon={Hash} label="Spec ID">
          <span className="font-mono text-[11px] text-text-secondary">{spec.testSpecId}</span>
        </Card>
        <Card icon={Database} label="Workspace ID">
          <span className="font-mono text-[11px] text-text-secondary">{spec.workspaceId}</span>
        </Card>
        <Card icon={FileText} label="Format">
          <span className="flex items-center gap-2">
            <FormatBadge format={spec.format} />
            <span className="text-[11px] text-text-secondary">{spec.contentType}</span>
          </span>
        </Card>
      </div>
    </section>

    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Stats
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Test cases"  value={String(spec.testCaseCount)} icon={ListChecks} />
        <StatCard label="File size"   value={formatBytes(spec.fileSize)} icon={Database} />
        <StatCard label="Source"      value={spec.source} icon={Globe} />
        <StatCard
          label="Updated"
          value={formatRelative(typeof spec.updatedAt === 'string' ? spec.updatedAt : '')}
          icon={Calendar}
        />
      </div>
    </section>

    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Audit
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card icon={User} label="Created by">
          <span className="text-[11px] text-text-secondary">{spec.createdByEmail ?? '—'}</span>
        </Card>
        <Card icon={Calendar} label="Created at">
          <span className="text-[11px] text-text-secondary">
            {typeof spec.createdAt === 'string' ? new Date(spec.createdAt).toLocaleString() : '—'}
          </span>
        </Card>
      </div>
    </section>

    <section>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Description
      </h3>
      <div className="rounded-lg border border-border bg-surface/40 p-4 text-xs leading-relaxed text-text-secondary">
        {spec.description?.trim() ? spec.description : <em className="text-text-muted">No description.</em>}
      </div>
    </section>

    {spec.tags && spec.tags.length > 0 && (
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {spec.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-surface/40 px-2 py-0.5 text-[10px] text-text-secondary"
            >
              <Tag className="h-2.5 w-2.5" /> {t}
            </span>
          ))}
        </div>
      </section>
    )}

    {spec.importUrl && (
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Source URL
        </h3>
        <code className="block break-all rounded-lg border border-border bg-surface/40 p-3 font-mono text-[11px] text-text-secondary">
          {spec.importUrl}
        </code>
      </section>
    )}
  </div>
);

const Card = ({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-surface/40 p-3">
    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className="break-all">{children}</div>
  </div>
);

const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
  <div className="rounded-lg border border-border bg-surface/40 p-3">
    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      <Icon className="h-3 w-3" /> {label}
    </div>
    <div className="text-base font-semibold tracking-tight">{value}</div>
  </div>
);
