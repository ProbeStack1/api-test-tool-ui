// src/pages/testing/TestingPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Beaker } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useLayout } from '@/stores/layout.store';   // ✅ import layout store

// Import all view components
import { SpecsListPage } from './specs/SpecsListPage';
import { SpecDetailPage } from './specs/SpecDetailPage';
import { AllCasesPage } from './cases/AllCasesPage';
import { LibraryPage } from './library/LibraryPage';
import { FunctionalTestsPage } from './functional/FunctionalTestsPage';
import { RunDetailPage } from './functional/RunDetailPage';
import { LoadTestsPage } from './load/LoadTestsPage';
import { LoadRunDetailPage } from './load/LoadRunDetailPage';
import { SecurityScanPage } from '../Security/SecurityScanPage';

type TestingSection = 'specs' | 'cases' | 'library' | 'functional' | 'load' | 'security';

const ALL_SECTIONS: TestingSection[] = [
  'specs', 'cases', 'library', 'functional', 'load', 'security'
];

// Helper to decide which component to render for a given section + URL params
function renderSection(section: TestingSection, workspaceId: string, params: URLSearchParams) {
  const specId = params.get('specId');
  const runId = params.get('runId');
  const loadRunId = params.get('loadRunId');

  switch (section) {
    case 'specs':
      return specId ? <SpecDetailPage specId={specId} /> : <SpecsListPage workspaceId={workspaceId} />;
    case 'cases':
      return <AllCasesPage workspaceId={workspaceId} />;
    case 'library':
      return <LibraryPage workspaceId={workspaceId} />;
    case 'functional':
      return runId ? <RunDetailPage runId={runId} /> : <FunctionalTestsPage workspaceId={workspaceId} />;
    case 'load':
      return loadRunId ? <LoadRunDetailPage loadRunId={loadRunId} /> : <LoadTestsPage workspaceId={workspaceId} />;
    case 'security':
      return <SecurityScanPage workspaceId={workspaceId} />;
    default:
      return null;
  }
}

export const TestingPage = () => {
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [params] = useSearchParams();
  const section = (params.get('section') as TestingSection) || 'specs';
  const setPrimaryTab = useLayout((s) => s.setPrimaryTab);   // ✅

  // ✅ CRITICAL: Set primaryTab to 'testing' so that ContextSidebar renders TestingPanel
  useEffect(() => {
    setPrimaryTab('testing');
    // Optional: reset when unmounting (if you want to go back to default)
    return () => {
      setPrimaryTab('collection');
    };
  }, [setPrimaryTab]);

  // Keep-alive: mount each section once it's visited
  const [mountedSections, setMountedSections] = useState<Set<TestingSection>>(new Set([section]));
  useEffect(() => {
    setMountedSections(prev => prev.has(section) ? prev : new Set(prev).add(section));
  }, [section]);

  // Reset when workspace changes
  useEffect(() => {
    setMountedSections(new Set([section]));
  }, [workspaceId, section]);

  if (!workspaceId) {
    return (
      <div className="grid h-full place-items-center text-text-muted">
        <div className="text-center">
          <Beaker className="mx-auto mb-2 h-8 w-8 opacity-50" />
          <p className="text-sm">Select a workspace to access Testing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-probestack-bg" data-testid="testing-page">
      {ALL_SECTIONS.filter(s => mountedSections.has(s)).map(s => (
        <div
          key={s}
          data-testid={`testing-view-${s}`}
          aria-hidden={s !== section}
          style={{ display: s === section ? 'block' : 'none' }}
        >
          {renderSection(s, workspaceId, params)}
        </div>
      ))}
    </div>
  );
};