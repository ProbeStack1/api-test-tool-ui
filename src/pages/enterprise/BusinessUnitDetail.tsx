import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ArrowLeft, FolderOpen, Loader2, Users, Calendar, Mail, User, ChevronRight } from 'lucide-react';
import { getBusinessUnitTree, type BusinessUnitTree } from '@/services/enterprise.service';
import { cn } from '@/utils/cn';

export const BusinessUnitDetail = () => {
  const { buId } = useParams<{ buId: string }>();
  const navigate = useNavigate();

  const { data: tree, isLoading, error } = useQuery<BusinessUnitTree>({
    queryKey: ['enterprise', 'business-unit', buId],
    queryFn: () => getBusinessUnitTree(buId!),
    enabled: !!buId,
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tree) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Building2 className="h-16 w-16 text-text-muted" />
        <p className="mt-4 text-lg text-text-muted">Business unit not found</p>
        <button
          onClick={() => navigate('/enterprise/bu')}
          className="mt-6 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          Back to list
        </button>
      </div>
    );
  }

  const { businessUnit: bu, projects } = tree;

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/enterprise/bu')}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Back to business units
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{bu.name}</h1>
              <span className="rounded-md bg-surface px-3 py-1 text-sm font-mono text-text-muted">{bu.code}</span>
            </div>
            <p className="mt-1 text-sm text-text-muted">
              View ownership, onboarding status, and the project tree with applications nested under each project.
            </p>
          </div>
        </div>
      </div>

      {/* Overview cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Status</div>
          <div className="mt-1 text-lg font-semibold text-text-primary">{bu.status}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Projects</div>
          <div className="mt-1 text-lg font-semibold text-text-primary">{bu.projectCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Applications</div>
          <div className="mt-1 text-lg font-semibold text-text-primary">{bu.applicationCount}</div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-text-muted">Owner</div>
          <div className="mt-1 truncate text-lg font-semibold text-text-primary">{bu.ownerName || '—'}</div>
        </div>
      </div>

      {/* Hierarchy - Project tree */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Hierarchy</h2>
        <div className="mt-1 text-sm text-text-muted">
          {bu.projectCount} projects / {bu.applicationCount} apps
        </div>
        {projects.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
            No projects found.
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            {projects.map((project) => (
              <div key={project.id} className="rounded-xl border border-border bg-surface p-5">
                <Link
                  to={`/enterprise/project/${project.id}`}
                  className="flex items-center justify-between group"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary group-hover:text-primary">
                      {project.name}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {project.status}
                      </span>
                      {project.expectedGoLiveDate && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          Go-live {new Date(project.expectedGoLiveDate).toLocaleDateString()}
                        </span>
                      )}
                      <span>Owner {project.ownerName || '—'}</span>
                      <span className="flex items-center gap-1.5">
                        <FolderOpen className="h-4 w-4" />
                        {project.applicationCount} apps
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-text-muted group-hover:text-primary" />
                </Link>

                {project.applications && project.applications.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
                    {project.applications.map((app) => (
                      <Link
                        key={app.id}
                        to={`/enterprise/application/${app.id}`}
                        className="flex items-center justify-between rounded-lg bg-probestack-bg px-4 py-3 hover:bg-hover"
                      >
                        <div className="flex flex-wrap items-center gap-4">
                          <FolderOpen className="h-4 w-4 text-text-muted" />
                          <span className="text-base font-medium text-text-primary">{app.name}</span>
                          <span className="text-sm text-text-muted">{app.applicationId}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessUnitDetail;