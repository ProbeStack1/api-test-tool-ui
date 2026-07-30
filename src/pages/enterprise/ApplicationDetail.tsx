import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, ExternalLink, Building2, FolderOpen, User, Mail,
  Calendar, FileText, Loader2, Info, Users, Code2, Layers,
} from 'lucide-react';
import { getApplicationDetail, type Application } from '@/services/enterprise.service';
import { cn } from '@/utils/cn';

const ChevronRight = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export const ApplicationDetail = () => {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const { data: app, isLoading, error } = useQuery<Application>({
    queryKey: ['enterprise', 'application', appId],
    queryFn: () => getApplicationDetail(appId!),
    enabled: !!appId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Info className="h-16 w-16 text-text-muted" />
        <p className="mt-4 text-lg text-text-muted">Application not found</p>
        <button
          onClick={() => navigate('/enterprise/application')}
          className="mt-6 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Back to applications
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/enterprise/application')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </button>

      {/* Breadcrumb / Hierarchy */}
      <div className="mb-5 flex flex-wrap items-center gap-1 text-sm text-text-muted">
        <Link to="/enterprise/bu" className="hover:text-primary">Enterprise</Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/enterprise/bu/${app.businessUnitId}`} className="hover:text-primary">
          {app.businessUnitName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link to={`/enterprise/project/${app.projectId}`} className="hover:text-primary">
          {app.projectName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-text-primary">{app.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{app.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Code2 className="h-4 w-4" />
              ID: {app.applicationId}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Status: {app.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">
            View application ownership, consumer access, and metadata shared with downstream platform tools.
          </p>
        </div>
        <a
          href={`https://probestack.io`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-hover"
        >
          <ExternalLink className="h-4 w-4" />
          Edit
        </a>
      </div>

      {/* Application Details */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DetailItem icon={Building2} label="Business Unit" value={app.businessUnitName || '—'} />
          <DetailItem icon={FolderOpen} label="Project" value={app.projectName || '—'} />
          <DetailItem icon={User} label="Owner" value={app.ownerName || '—'} />
          <DetailItem icon={Mail} label="Owner Email" value={app.ownerEmail || '—'} />
          <DetailItem icon={User} label="Application SME" value={app.applicationSme || '—'} />
          <DetailItem icon={Mail} label="SME Email" value={app.smeEmail || '—'} />
          <DetailItem icon={User} label="Tester" value={app.testerName || '—'} />
          <DetailItem icon={Mail} label="Tester Email" value={app.testerEmail || '—'} />
          <DetailItem icon={Layers} label="ServiceNow Group" value={app.serviceNowGroupName || '—'} />
          <DetailItem icon={Mail} label="ServiceNow Email" value={app.serviceNowEmail || '—'} />
          <DetailItem icon={Users} label="Consumer Count" value={String(app.consumerCount || 0)} />
          <DetailItem icon={Calendar} label="Created" value={app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '—'} />
          <DetailItem icon={FileText} label="Organization ID" value={app.organizationId || '—'} fullWidth />
        </dl>
      </div>
    </div>
  );
};

const DetailItem = ({
  icon: Icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  fullWidth?: boolean;
}) => (
  <div className={cn('flex items-start gap-3', fullWidth && 'sm:col-span-2')}>
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
    <div className="min-w-0 flex-1">
      <dt className="text-sm font-medium text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-base text-text-primary">{value}</dd>
    </div>
  </div>
);

export default ApplicationDetail;