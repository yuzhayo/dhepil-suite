import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Input,
  Segmented,
  Select,
  Skeleton,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';

import {
  selectProjects,
  type ProjectSortMode,
  type ProjectViewMode,
} from '../domain/projectCollection';
import { useProjectManager } from '../application/useProjectManager';
import { ProjectCard } from '../components/ProjectCard';

const { Paragraph, Text, Title } = Typography;

const sortOptions: Array<{ label: string; value: ProjectSortMode }> = [
  { label: 'Nama A–Z', value: 'name-asc' },
  { label: 'Nama Z–A', value: 'name-desc' },
  { label: 'Port terkecil', value: 'port-asc' },
  { label: 'Aktif lebih dulu', value: 'active-first' },
];

export function ControlCenterScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<ProjectSortMode>('name-asc');
  const [viewMode, setViewMode] = useState<ProjectViewMode>('grid');
  const { projects, loading, pageError, pendingActions, refresh, startAndOpen, stop } =
    useProjectManager();
  const activeProjects = projects.filter((project) =>
    ['starting', 'running', 'external', 'stopping', 'not-found'].includes(project.status),
  );
  const visibleProjects = useMemo(
    () => selectProjects(projects, searchQuery, sortMode),
    [projects, searchQuery, sortMode],
  );
  const activeServerItems: MenuProps['items'] =
    activeProjects.length > 0
      ? activeProjects.map((project) => {
          const canQuickKill =
            project.managed && project.status !== 'stopping' && !pendingActions[project.id];

          return {
            key: project.id,
            danger: canQuickKill,
            disabled: !canQuickKill,
            label: (
              <span className="quick-server-item">
                <span>
                  <strong>{project.name}</strong>
                  <small>
                    :{project.port}
                    {project.pid ? ` · PID ${project.pid}` : ' · external'}
                  </small>
                </span>
                <span
                  className={`quick-kill-action${project.managed ? '' : ' quick-kill-action--external'}`}
                >
                  {project.managed
                    ? pendingActions[project.id]
                      ? 'Stopping…'
                      : 'Kill'
                    : 'External'}
                </span>
              </span>
            ),
          };
        })
      : [
          {
            key: 'no-active-server',
            disabled: true,
            label: 'Tidak ada server aktif',
          },
        ];

  const handleQuickKill: MenuProps['onClick'] = ({ key }) => {
    const project = activeProjects.find((candidate) => candidate.id === key);
    if (project?.managed && project.status !== 'stopping') {
      void stop(project);
    }
  };

  return (
    <main className="control-center">
      <header className="control-center-header">
        <div className="header-content">
          <Title level={1}>Dhepil Suite</Title>
          <Paragraph>
            Nyalakan, buka, pantau, dan hentikan semua app dari satu control center lokal.
          </Paragraph>
        </div>
      </header>

      <section className="project-section" aria-labelledby="project-list-title">
        <Title id="project-list-title" level={2} className="sr-only">
          Daftar project
        </Title>

        <div className="project-toolbar" role="search" aria-label="Cari dan atur project">
          <Input
            className="project-search"
            allowClear
            aria-label="Cari project"
            placeholder="Cari nama, folder, atau port"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <Select<ProjectSortMode>
            className="project-sort"
            aria-label="Urutkan project"
            options={sortOptions}
            value={sortMode}
            onChange={setSortMode}
          />
          <Segmented
            aria-label="Mode tampilan project"
            options={[
              { label: 'Grid', value: 'grid' },
              { label: 'List', value: 'list' },
            ]}
            value={viewMode}
            onChange={(value) => setViewMode(value as ProjectViewMode)}
          />
          <Button onClick={() => void refresh()}>Refresh</Button>
          <Dropdown
            menu={{
              items: activeServerItems,
              onClick: handleQuickKill,
            }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button className="quick-server-button">
              Server aktif ({activeProjects.length}) ▾
            </Button>
          </Dropdown>
          <Text className="project-summary" aria-live="polite">
            {visibleProjects.length} ditampilkan
          </Text>
        </div>

        {pageError ? (
          <Alert
            className="page-alert"
            type="error"
            showIcon
            title="Control center mengalami masalah"
            description={pageError}
            action={<Button onClick={() => void refresh()}>Coba lagi</Button>}
          />
        ) : null}

        <div className="project-scroll">
          {loading && projects.length === 0 ? (
            <div
              className="project-collection project-collection--grid"
              aria-label="Memuat project"
            >
              <Skeleton active />
              <Skeleton active />
            </div>
          ) : visibleProjects.length === 0 ? (
            <Empty
              className="project-empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Project tidak ditemukan"
            />
          ) : (
            <div
              className={`project-collection project-collection--${viewMode}`}
              aria-label={`Daftar project mode ${viewMode}`}
            >
              {visibleProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  pending={Boolean(pendingActions[project.id])}
                  onStartAndOpen={(selected) => void startAndOpen(selected)}
                  onStop={(selected) => void stop(selected)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
