/**
 * RunnerTab — minimal "configure & queue" surface for the Functional section.
 *
 * Carved out from the old `RunsTab` (which used to mix the form and the
 * runs table). With Runner alone here, users open the section and see
 * just the run-config form (or the live stream when a run is in flight),
 * without the recent-runs table competing for vertical space.
 *
 * The all-runs paginated table now lives on the **Runs** tab.
 */
import { useTestingStore } from '@/stores/testing.store';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { InlineStartRunForm } from '../InlineStartRunForm';
import { LiveFunctionalRunPanel } from '../LiveFunctionalRunPanel';

interface Props { workspaceId: string }

export const RunnerTab = ({ workspaceId }: Props) => {
  const liveRunId = useTestingStore((s) => s.liveFunctionalRunId);
  const ws = useWorkspaceStore((s) => s.current);
  void ws; // workspace check happens in the parent page

  return (
    <div className="h-full overflow-auto" data-testid="functional-runner-tab">
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        {liveRunId
          ? <LiveFunctionalRunPanel runId={liveRunId} />
          : <InlineStartRunForm workspaceId={workspaceId} />}
      </div>
    </div>
  );
};
