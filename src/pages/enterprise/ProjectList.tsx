import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderOpen, Users, Calendar, Building2, ChevronRight } from 'lucide-react';
import { getProjects, getBusinessUnits, type Project, type BusinessUnit } from '@/services/enterprise.service';
import { Skeleton } from '@/components/ui/Skeleton';

export const ProjectList = () => {
  const [selectedBuId, setSelectedBuId] = useState<string>('');

  const { data: allProjects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ['enterprise', 'projects'],
    queryFn: () => getProjects(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: bus = [], isLoading: busLoading } = useQuery<BusinessUnit[]>({
    queryKey: ['enterprise', 'business-units'],
    queryFn: () => getBusinessUnits(),
    staleTime: 5 * 60 * 1000,
  });

  const filteredProjects = selectedBuId
    ? allProjects.filter(p => p.businessUnitId === selectedBuId)
    : allProjects;

  if (projectsLoading || busLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="mt-2 h-5 w-1/2" />
            <Skeleton className="mt-4 h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Projects</h1>
          <p className="mt-1 text-sm text-text-muted">
            All projects – filter by business unit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-text-muted">Filter by BU:</label>
          <select
            value={selectedBuId}
            onChange={(e) => setSelectedBuId(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text-primary focus:border-primary focus:outline-none"
          >
            <option value="">All Business Units</option>
            {bus.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-text-muted">
            No projects found {selectedBuId && 'for this business unit'}.
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              to={`/enterprise/project/${project.id}`}
              className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-text-primary group-hover:text-primary">
                    {project.name}
                  </h2>
                  <div className="mt-1 flex items-center gap-2 text-sm text-text-muted">
                    <Building2 className="h-4 w-4" />
                    {project.businessUnitName}
                  </div>
                </div>
                <FolderOpen className="h-5 w-5 shrink-0 text-text-muted group-hover:text-primary" />
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {project.applicationCount} apps
                </span>
                {project.expectedGoLiveDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {new Date(project.expectedGoLiveDate).toLocaleDateString()}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-1 text-primary">
                  View <ChevronRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;