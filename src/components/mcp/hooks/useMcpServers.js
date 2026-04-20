// src/components/mcp/hooks/useMcpServers.js
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  mcpListServers, mcpCreateServer, mcpUpdateServer, mcpDeleteServer, mcpProbeServer,
} from '../../../services/mcpService';

/**
 * Loads + mutates the list of saved MCP servers for a workspace.
 * Tracks a "activeServerId" so every MCP tab can sync on the same selection.
 */
export default function useMcpServers(workspaceId) {
  const [servers, setServers]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [activeId, setActiveId] = useState(null);

  const refresh = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data } = await mcpListServers(workspaceId);
      const list = Array.isArray(data) ? data : (data?.items || []);
      setServers(list);
      setActiveId(prev => {
        if (prev && list.some(s => (s.id || s.serverId) === prev)) return prev;
        return list[0] ? (list[0].id || list[0].serverId) : null;
      });
    } catch (err) {
      console.error('[mcp] list servers failed', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  const createServer = useCallback(async (payload) => {
    try {
      const { data } = await mcpCreateServer({ ...payload, workspaceId });
      toast.success(`Server "${data.name || payload.name}" registered`);
      await refresh();
      if (data?.id) setActiveId(data.id);
      return data;
    } catch (err) {
      toast.error('Failed to create server: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  }, [workspaceId, refresh]);

  const updateServer = useCallback(async (id, payload) => {
    try {
      await mcpUpdateServer(id, payload);
      toast.success('Server updated');
      await refresh();
    } catch (err) {
      toast.error('Update failed: ' + (err.response?.data?.message || err.message));
    }
  }, [refresh]);

  const deleteServer = useCallback(async (id) => {
    try {
      await mcpDeleteServer(id);
      toast.success('Server removed');
      setServers(prev => prev.filter(s => (s.id || s.serverId) !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) {
      toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  }, [activeId]);

  const probeServer = useCallback(async (id) => {
    try {
      const { data } = await mcpProbeServer(id);
      setServers(prev => prev.map(s => (s.id || s.serverId) === id ? { ...s, ...data } : s));
      return data;
    } catch (err) {
      toast.error('Probe failed: ' + (err.response?.data?.message || err.message));
      throw err;
    }
  }, []);

  const activeServer = servers.find(s => (s.id || s.serverId) === activeId) || null;

  return {
    servers, loading, refresh,
    activeId, activeServer, setActiveId,
    createServer, updateServer, deleteServer, probeServer,
  };
}
