import { FeatureStub } from '@/components/common/FeatureStub';
import { Gauge } from 'lucide-react';
export const LoadTestsPage = () => (
  <FeatureStub
    title="Load Tests"
    description="Ramp-up profiles, concurrency, thresholds and real-time metrics for load runs."
    testId="load-tests-page"
    icon={Gauge}
  />
);
