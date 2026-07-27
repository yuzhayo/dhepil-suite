import { Alert, Badge, Button, Card, Flex, Space, Tag, Typography } from 'antd';
import type { BadgeProps } from 'antd';

import type { ProjectViewMode } from '../domain/projectCollection';
import type { ProjectStatus, ProjectSummary } from '../types';

const { Text } = Typography;

const statusPresentation: Record<ProjectStatus, { badge: BadgeProps['status']; label: string }> = {
  stopped: { badge: 'default', label: 'Tidak aktif' },
  starting: { badge: 'processing', label: 'Sedang dinyalakan' },
  running: { badge: 'success', label: 'Aktif' },
  stopping: { badge: 'warning', label: 'Sedang dihentikan' },
  error: { badge: 'error', label: 'Terjadi error' },
  invalid: { badge: 'error', label: 'Konfigurasi tidak valid' },
  external: { badge: 'success', label: 'Aktif di luar dashboard' },
  'port-conflict': { badge: 'warning', label: 'Port bentrok' },
  'not-found': { badge: 'error', label: 'App not found (404)' },
};

interface ProjectCardProps {
  project: ProjectSummary;
  viewMode: ProjectViewMode;
  pending: boolean;
  onStartAndOpen: (project: ProjectSummary) => void;
  onStop: (project: ProjectSummary) => void;
}

export function ProjectCard({
  project,
  viewMode,
  pending,
  onStartAndOpen,
  onStop,
}: ProjectCardProps) {
  const status = statusPresentation[project.status];
  const canStart = ['stopped', 'error'].includes(project.status);
  const canStop = project.managed && project.status !== 'stopping';
  const isAlreadyActive = ['running', 'external'].includes(project.status);
  const canStartOrOpen = canStart || isAlreadyActive;
  const visibleLogs = project.logs.slice(-80);

  return (
    <Card
      role="article"
      aria-label={`Project ${project.name}`}
      className={`project-card project-card--${viewMode}`}
      title={project.name}
      extra={<Badge status={status.badge} text={status.label} />}
      variant="outlined"
    >
      <div className="project-controls">
        <Space wrap className="project-actions">
          <Button
            type="primary"
            disabled={!canStartOrOpen}
            loading={pending && !canStop}
            onClick={() => onStartAndOpen(project)}
          >
            {isAlreadyActive ? 'Buka project' : canStart ? 'Start & buka' : 'Tidak tersedia'}
          </Button>
          <Button
            danger
            disabled={!canStop}
            loading={pending && canStop}
            onClick={() => onStop(project)}
          >
            Stop server
          </Button>
        </Space>

        <Flex wrap gap={6} className="project-metadata">
          {project.port !== undefined ? <Tag variant="filled">Port {project.port}</Tag> : null}
          {project.pid ? <Tag variant="filled">PID {project.pid}</Tag> : null}
        </Flex>

        {project.status === 'invalid' ? (
          <Alert
            className="project-alert"
            type="error"
            showIcon
            title="Kontrak app tidak valid"
            description={project.error}
          />
        ) : null}

        {project.status === 'port-conflict' ? (
          <Alert
            className="project-alert"
            type="warning"
            showIcon
            title={`Locked port ${project.port} sedang dipakai`}
            description="Root tidak memindahkan port otomatis. Bebaskan port tersebut untuk menyalakan app."
          />
        ) : null}

        {project.status === 'external' ? (
          <Alert
            className="project-alert"
            type="warning"
            showIcon
            title="Server berjalan di luar root"
            description="Server dapat dibuka, tetapi identitas dan process-nya tidak dikelola root."
          />
        ) : null}

        {project.status === 'not-found' ? (
          <Alert
            className="project-alert"
            type="error"
            showIcon
            title="App not found (404)"
            description="Folder atau kontrak app sudah hilang. Hentikan managed process untuk membersihkan card ini."
          />
        ) : null}

        {project.error && !['invalid', 'not-found'].includes(project.status) ? (
          <Alert
            className="project-alert"
            type="error"
            showIcon
            title="Process gagal"
            description={project.error}
          />
        ) : null}
      </div>

      <section className="project-console" aria-label={`Log ${project.name}`}>
        <Flex justify="space-between" align="center" className="console-heading">
          <Text strong>Output process</Text>
          <Text type="secondary">{project.managed ? 'Managed root' : 'Tidak dikelola root'}</Text>
        </Flex>
        <pre aria-live="polite">
          {visibleLogs.length > 0 ? visibleLogs.join('\n') : 'Belum ada output process.'}
        </pre>
      </section>
    </Card>
  );
}
