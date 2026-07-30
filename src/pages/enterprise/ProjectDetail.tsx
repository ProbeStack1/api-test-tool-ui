import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen, Users, Calendar, Mail, User, Building2, Loader2, ChevronRight } from 'lucide-react';
import { getProjectDetail, getProjectApplications, type Project, type TreeApplication } from '@/services/enterprise.service';
import { cn } from '@/utils/cn';

export const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['enterprise', 'project', projectId],
    queryFn: () => getProjectDetail(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  const { data: applications = [], isLoading: appsLoading } = useQuery<TreeApplication[]>({
    queryKey: ['enterprise', 'project-applications', projectId],
    queryFn: () => getProjectApplications(projectId!),
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000,
  });

  if (projectLoading || appsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <FolderOpen className="h-16 w-16 text-text-muted" />
        <p className="mt-4 text-lg text-text-muted">Project not found</p>
        <button
          onClick={() => navigate('/onboarding/project')}
          className="mt-6 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Back to projects
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/onboarding/project')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to projects
      </button>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-text-muted">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4" />
              {project.businessUnitName}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Status: {project.status}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-primary-muted px-3 py-1.5 text-sm font-medium text-primary">
          {project.applicationCount} Applications
        </div>
      </div>

      {/* Project Details */}
      <div className="mb-6 rounded-xl border border-border bg-surface p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label="Owner" value={project.ownerName || '—'} icon={User} />
          <DetailItem label="Owner Email" value={project.ownerEmail || '—'} icon={Mail} />
          <DetailItem label="Delivery Model" value={project.deliveryModel || '—'} icon={Building2} />
          <DetailItem label="Expected Go‑Live" value={project.expectedGoLiveDate ? new Date(project.expectedGoLiveDate).toLocaleDateString() : '—'} icon={Calendar} />
          <DetailItem label="Project DL Email" value={project.projectDlEmail || '—'} icon={Mail} />
          <DetailItem label="Code" value={project.code || '—'} icon={Building2} />
        </dl>
      </div>

      {/* Applications list */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Applications</h2>
        {applications.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
            No applications found.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {applications.map((app) => (
              <Link
                key={app.id}
                to={`/onboarding/application/${app.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-surface p-4 hover:border-primary/50 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <FolderOpen className="h-5 w-5 text-text-muted" />
                  <div>
                    <div className="text-base font-medium text-text-primary">{app.name}</div>
                    <div className="text-sm text-text-muted">ID: {app.applicationId}</div>
                  </div>
                  <span className="text-sm text-text-muted">{app.consumerCount} consumers</span>
                  <span className={cn(
                    'text-sm font-medium',
                    app.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'
                  )}>
                    {app.status}
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) => (
  <div className="flex items-start gap-3">
    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
    <div>
      <dt className="text-sm font-medium text-text-muted">{label}</dt>
      <dd className="text-base text-text-primary">{value}</dd>
    </div>
  </div>
);

export default ProjectDetail;