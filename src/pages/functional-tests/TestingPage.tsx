/**
 * Testing workspace — merged Functional + Load + Spec Library + Test Cases.
 * Left sidebar's TestingPanel drives the sub-route.
 */
import { FeatureStub } from '@/components/common/FeatureStub';
import { TestTube2 } from 'lucide-react';
export const TestingPage = () => (
  <FeatureStub
    title="Testing"
    description="Unified workspace for Spec Library, Test Cases, Functional Tests and Load Tests."
    testId="testing-page"
    icon={TestTube2}
  />
);
