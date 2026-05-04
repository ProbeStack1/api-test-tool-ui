/**
 * NoProjectEmpty — shared "pick a project" empty state used across every
 * project-scoped page (Trash, Audit, Monitors, Heartbeats, Digests,
 * Testing, API Docs, …). Uses the animated `FancyEmpty` component so the
 * app never shows a dead blank page.
 *
 * The `hint` nudges the user toward the right rail (introduced in iter 52),
 * where the PROJECTS picker lives.
 */
import { FancyEmpty } from './FancyEmpty';
import type { IconName } from '@/components/icons/AppIcons';

export const NoProjectEmpty = ({
  testId = 'no-project-empty',
  icon = 'project',
  surface = 'this page',
}: { testId?: string; icon?: IconName; surface?: string }) => (
  <div className="flex h-full items-center justify-center p-8">
    <FancyEmpty
      testId={testId}
      icon={icon}
      title="Pick a project to continue"
      body={`${surface[0].toUpperCase() + surface.slice(1)} is scoped per project. Choose one from the right rail or create a new project to get started.`}
      steps={[
        'Open the right rail (bottom-right layout toggle)',
        'Pick an existing project, or click + Create',
        'Your data will appear here instantly',
      ]}
    />
  </div>
);
