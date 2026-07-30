import type { AlertKey, SemanticTone, StatusKey, TagKey } from '../src/features/control-center/application/view-models';

export type CardActionKind = 'default' | 'primary' | 'danger';
export type StatusBadgeKind = 'success' | 'processing' | 'default' | 'error' | 'warning';
export type AlertPresentationKind = 'success' | 'info' | 'warning' | 'error';

export interface CardActionDefinition {
  id: string;
  actionId: string;
  order: number;
  kind: CardActionKind;
  defaultLabel: string;
  labelByStatus?: Partial<Record<StatusKey, string>>;
}

export interface StatusPresentationDefinition {
  label: string;
  badge: StatusBadgeKind;
}

export interface TagPresentationDefinition {
  label: string;
  color: string;
  showValue: boolean;
}

export interface AlertPresentationDefinition {
  title: string;
  description: string;
}

export const cardDefinition = {
  actions: [
    {
      id: 'start-open',
      actionId: 'project.start-open',
      order: 10,
      kind: 'primary',
      defaultLabel: 'Tidak tersedia',
      labelByStatus: {
        stopped: 'Start & buka',
        error: 'Start & buka',
        running: 'Buka project',
        external: 'Buka project',
      },
    },
    {
      id: 'stop',
      actionId: 'project.stop',
      order: 20,
      kind: 'danger',
      defaultLabel: 'Stop server',
    },
    {
      id: 'quick-kill',
      actionId: 'project.quick-kill',
      order: 30,
      kind: 'danger',
      defaultLabel: 'Kill process',
    },
  ] satisfies readonly CardActionDefinition[],
  statuses: {
    stopped: { badge: 'default', label: 'Tidak aktif' },
    starting: { badge: 'processing', label: 'Sedang dinyalakan' },
    running: { badge: 'success', label: 'Aktif' },
    stopping: { badge: 'warning', label: 'Sedang dihentikan' },
    error: { badge: 'error', label: 'Terjadi error' },
    invalid: { badge: 'error', label: 'Konfigurasi tidak valid' },
    external: { badge: 'success', label: 'Aktif di luar dashboard' },
    'port-conflict': { badge: 'warning', label: 'Port bentrok' },
    'not-found': { badge: 'error', label: 'App not found (404)' },
  } satisfies Record<StatusKey, StatusPresentationDefinition>,
  tags: {
    managed: { label: 'Managed root', color: 'blue', showValue: false },
    external: { label: 'External', color: 'orange', showValue: false },
    tombstone: { label: 'Tombstone', color: 'gold', showValue: false },
    port: { label: 'Port', color: 'default', showValue: true },
    pid: { label: 'PID', color: 'default', showValue: true },
    path: { label: 'Path', color: 'default', showValue: true },
    desktop: { label: 'Electron siap dikonfigurasi', color: 'purple', showValue: false },
  } satisfies Record<TagKey, TagPresentationDefinition>,
  alerts: {
    'startup-failed': {
      title: 'Process gagal',
      description: 'Server tidak berhasil mencapai status siap.',
    },
    'port-conflict': {
      title: 'Locked port sedang dipakai',
      description:
        'Root tidak memindahkan port otomatis. Bebaskan locked port sebelum menyalakan app.',
    },
    'invalid-config': {
      title: 'Kontrak app tidak valid',
      description: 'Periksa manifest dan konfigurasi app.',
    },
    'project-not-found': {
      title: 'App not found (404)',
      description:
        'Folder atau kontrak app sudah hilang. Hentikan managed process untuk membersihkan card ini.',
    },
    'process-error': {
      title: 'Process gagal',
      description: 'Process manager melaporkan kegagalan.',
    },
    'page-error': {
      title: 'Control center mengalami masalah',
      description: 'Muat ulang daftar project untuk mencoba kembali.',
    },
  } satisfies Record<AlertKey, AlertPresentationDefinition>,
  alertTypes: {
    neutral: 'info',
    info: 'info',
    success: 'success',
    warning: 'warning',
    danger: 'error',
  } satisfies Record<SemanticTone, AlertPresentationKind>,
  terminal: {
    title: 'Output process',
    accessibleName: 'Output process',
    emptyCopy: 'Belum ada output process.',
    truncatedCopy: 'Hanya baris log terbaru yang ditampilkan.',
  },
};
