import { useCallback, useEffect, useRef, useState } from 'react';

import type { ProjectSummary, ProjectsResponse } from '../types';

const pollIntervalMilliseconds = 1500;
const startupAttempts = 40;
const startupDelayMilliseconds = 750;

function delay(milliseconds: number) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function readProjects(): Promise<ProjectSummary[]> {
  const response = await fetch('/api/projects', {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Gagal membaca status project (${response.status}).`);
  }

  const payload = (await response.json()) as ProjectsResponse;
  return payload.projects;
}

async function runAction(projectId: string, action: 'start' | 'stop') {
  const response = await fetch(`/api/projects/${projectId}/${action}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });
  const payload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Aksi ${action} gagal.`);
  }
}

function prepareWaitingTab(tab: Window, projectName: string) {
  tab.document.title = `Menyalakan ${projectName}`;
  tab.document.body.style.cssText =
    'margin:0;min-height:100vh;display:grid;place-items:center;background:#071426;color:#fff;font:16px system-ui';
  tab.document.body.textContent = `Menyalakan ${projectName}…`;
}

export function useProjectManager() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string>();
  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const nextProjects = await readProjects();
      if (mountedRef.current) {
        setProjects(nextProjects);
        setPageError(undefined);
      }
      return nextProjects;
    } catch (error) {
      if (mountedRef.current) {
        setPageError(error instanceof Error ? error.message : String(error));
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollIntervalMilliseconds);

    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh]);

  const setPending = useCallback((projectId: string, value: boolean) => {
    setPendingActions((current) => ({
      ...current,
      [projectId]: value,
    }));
  }, []);

  const startAndOpen = useCallback(
    async (project: ProjectSummary) => {
      if ((project.status === 'running' || project.status === 'external') && project.url) {
        window.open(project.url, '_blank', 'noopener,noreferrer');
        return;
      }

      const waitingTab = window.open('about:blank', `dhepil-suite-${project.id}`);
      if (waitingTab) {
        prepareWaitingTab(waitingTab, project.name);
      }

      setPending(project.id, true);
      try {
        await runAction(project.id, 'start');

        for (let attempt = 0; attempt < startupAttempts; attempt += 1) {
          const nextProjects = await refresh();
          const current = nextProjects.find((candidate) => candidate.id === project.id);
          if ((current?.status === 'running' || current?.status === 'external') && current.url) {
            if (waitingTab) {
              waitingTab.opener = null;
              waitingTab.location.replace(current.url);
            } else {
              window.open(current.url, '_blank', 'noopener,noreferrer');
            }
            return;
          }
          if (
            current &&
            ['error', 'invalid', 'port-conflict', 'not-found'].includes(current.status)
          ) {
            throw new Error(current.error ?? `${project.name} tidak dapat dinyalakan.`);
          }
          await delay(startupDelayMilliseconds);
        }

        throw new Error(`${project.name} belum siap setelah 30 detik.`);
      } catch (error) {
        waitingTab?.close();
        setPageError(error instanceof Error ? error.message : String(error));
      } finally {
        setPending(project.id, false);
        await refresh();
      }
    },
    [refresh, setPending],
  );

  const stop = useCallback(
    async (project: ProjectSummary) => {
      setPending(project.id, true);
      try {
        await runAction(project.id, 'stop');
      } catch (error) {
        setPageError(error instanceof Error ? error.message : String(error));
      } finally {
        setPending(project.id, false);
        await refresh();
      }
    },
    [refresh, setPending],
  );

  return {
    projects,
    loading,
    pageError,
    pendingActions,
    refresh,
    startAndOpen,
    stop,
  };
}
