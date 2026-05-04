import { FeatureStub } from '@/components/common/FeatureStub';
import { Bug } from 'lucide-react';
export const BugTrackerPage = () => (
  <FeatureStub
    title="Bug Tracker"
    description="Backend failure events — why/how a test or integration failed, with correlation IDs."
    testId="bug-tracker-page"
    icon={Bug}
  />
);
