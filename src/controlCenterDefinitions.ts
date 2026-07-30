import type { HeaderAction, ToolbarControl } from '../ui/contracts';
import type { AlertKey, StatusKey, TagKey } from './engine/contracts';

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
  } satisfies Record<string, AlertPresentationKind>,
  terminal: {
    title: 'Output process',
    accessibleName: 'Output process',
    emptyCopy: 'Belum ada output process.',
    truncatedCopy: 'Hanya baris log terbaru yang ditampilkan.',
  },
};

export const headerDefinition = {
  title: 'Dhepil Suite',
  subtitle: 'Nyalakan, buka, pantau, dan hentikan semua app dari satu control center lokal.',
  actions: [
    {
      id: 'refresh-projects',
      label: 'Refresh',
      accessibleName: 'Refresh status project',
      actionId: 'project.refresh',
      kind: 'default',
      order: 10,
    },
  ] satisfies readonly HeaderAction[],
};

export const toolbarControls: readonly ToolbarControl[] = [
  {
    id: 'project-search',
    kind: 'search',
    actionId: 'project.search.change',
    accessibleName: 'Cari project',
    placeholder: 'Cari nama, folder, atau port',
    order: 10,
    group: 'query',
    responsivePriority: 10,
  },
  {
    id: 'project-sort',
    kind: 'select',
    actionId: 'project.sort.change',
    accessibleName: 'Urutkan project',
    options: [
      { label: 'Nama A–Z', value: 'name-asc' },
      { label: 'Nama Z–A', value: 'name-desc' },
      { label: 'Port terkecil', value: 'port-asc' },
      { label: 'Aktif lebih dulu', value: 'active-first' },
    ],
    order: 20,
    group: 'query',
    responsivePriority: 20,
  },
  {
    id: 'project-view',
    kind: 'view',
    actionId: 'project.view.change',
    accessibleName: 'Mode tampilan project',
    options: [
      { label: 'Grid', value: 'grid' },
      { label: 'List', value: 'list' },
    ],
    order: 30,
    group: 'query',
    responsivePriority: 30,
  },
  {
    id: 'project-refresh',
    kind: 'button',
    actionId: 'project.refresh',
    label: 'Refresh',
    accessibleName: 'Refresh daftar project',
    order: 40,
    group: 'actions',
    responsivePriority: 40,
  },
  {
    id: 'active-servers',
    kind: 'active-servers',
    actionId: 'project.quick-kill',
    label: 'Server aktif',
    accessibleName: 'Daftar server aktif',
    emptyLabel: 'Tidak ada server aktif',
    killLabel: 'Kill',
    killingLabel: 'Stopping…',
    externalLabel: 'External',
    pidLabel: 'PID',
    order: 50,
    group: 'actions',
    responsivePriority: 50,
  },
  {
    id: 'project-summary',
    kind: 'summary',
    visibleLabel: 'ditampilkan',
    totalLabel: 'total',
    accessibleName: 'Ringkasan project',
    order: 60,
    group: 'status',
    responsivePriority: 60,
  },
];

export const gridDefinition = {
  skeletonCount: 2,
  loadingAccessibleLabel: 'Memuat project',
  emptyAccessibleLabel: 'Daftar project kosong',
  emptyCopy: 'Project tidak ditemukan',
  cardOrderingPolicyName: 'view-model-order',
  layoutModes: [
    { id: 'grid', accessibleLabel: 'Daftar project mode grid' },
    { id: 'list', accessibleLabel: 'Daftar project mode list' },
  ],
};
