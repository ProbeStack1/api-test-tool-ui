/**
 * Login page — stub. Phase 1 wires auth.store + JWT.
 */
import { FeatureStub } from '@/components/common/FeatureStub';
import { LogIn } from 'lucide-react';
export const LoginPage = () => (
  <FeatureStub
    title="Sign in"
    description="JWT-based authentication (phase 1)."
    testId="login-page"
    icon={LogIn}
  />
);
