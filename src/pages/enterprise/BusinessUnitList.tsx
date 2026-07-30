import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Building2, Users, FolderOpen, ChevronRight } from 'lucide-react';
import { getBusinessUnits, type BusinessUnit } from '@/services/enterprise.service';
import { Skeleton } from '@/components/ui/Skeleton';

export const BusinessUnitList = () => {
  const { data: bus = [], isLoading, error } = useQuery<BusinessUnit[]>({
    queryKey: ['enterprise', 'business-units'],
    queryFn: () => getBusinessUnits(),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-border bg-surface p-6 shadow-sm">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-5 w-1/3" />
            <Skeleton className="mt-4 h-5 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-red-500">
        Failed to load business units.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Business Units</h1>
        <p className="mt-1 text-sm text-text-muted">
          View all business units in your organization.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {bus.map((bu) => (
          <Link
            key={bu.id}
            to={`/onboarding/bu/${bu.id}`}
            className="group rounded-xl border border-border bg-surface p-5 transition-all hover:border-primary/50 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-text-primary group-hover:text-primary">
                  {bu.name}
                </h2>
                <p className="mt-1 text-sm text-text-muted">{bu.code}</p>
              </div>
              <Building2 className="h-5 w-5 shrink-0 text-text-muted group-hover:text-primary" />
            </div>

            <div className="mt-3 flex items-center gap-5 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {bu.projectCount} projects
              </span>
              <span className="flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4" />
                {bu.applicationCount} apps
              </span>
              <span className="ml-auto flex items-center gap-1 text-primary">
                View <ChevronRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default BusinessUnitList;