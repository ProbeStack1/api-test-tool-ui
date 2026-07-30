import { Outlet, NavLink } from 'react-router-dom';
import { Building2, FolderOpen, Layers } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Header } from '@/components/common/Header';
import { StatusBar } from '@/components/common/StatusBar';
import { TerminalDrawer } from '@/components/common/terminal/TerminalDrawer';
import { FloatingChatbot } from '@/components/chatbot/FloatingChatbot';
import { GlobalShortcuts } from '@/components/common/GlobalShortcuts';
import { GlobalContextMenu } from '@/components/common/GlobalContextMenu';

export const EnterpriseLayout = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-probestack-bg text-text-primary">
      <GlobalShortcuts />
      <GlobalContextMenu />
      <Header />
      <div className="flex min-h-0 flex-1">
        {/* Main content */}
        <div className="min-w-0 flex-1 overflow-auto bg-probestack-bg">
          <Outlet />
        </div>
      </div>
      <StatusBar />
      <FloatingChatbot />
      <TerminalDrawer />
    </div>
  );
};

export default EnterpriseLayout;