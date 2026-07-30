interface ToolbarControlBase {
  id: string;
  order: number;
  group: 'query' | 'actions' | 'status';
  responsivePriority: number;
}

export interface ToolbarSearchDefinition extends ToolbarControlBase {
  kind: 'search';
  actionId: string;
  accessibleName: string;
  placeholder: string;
}

export interface ToolbarSelectDefinition extends ToolbarControlBase {
  kind: 'select';
  actionId: string;
  accessibleName: string;
  options: readonly ToolbarOptionDefinition[];
}

export interface ToolbarViewDefinition extends ToolbarControlBase {
  kind: 'view';
  actionId: string;
  accessibleName: string;
  options: readonly ToolbarOptionDefinition[];
}

export interface ToolbarButtonDefinition extends ToolbarControlBase {
  kind: 'button';
  actionId: string;
  label: string;
  accessibleName: string;
}

export interface ToolbarActiveServersDefinition extends ToolbarControlBase {
  kind: 'active-servers';
  actionId: string;
  label: string;
  accessibleName: string;
  emptyLabel: string;
  killLabel: string;
  killingLabel: string;
  externalLabel: string;
  pidLabel: string;
}

export interface ToolbarSummaryDefinition extends ToolbarControlBase {
  kind: 'summary';
  visibleLabel: string;
  totalLabel: string;
  accessibleName: string;
}

export interface ToolbarOptionDefinition {
  label: string;
  value: string;
}

export type ToolbarControlDefinition =
  | ToolbarSearchDefinition
  | ToolbarSelectDefinition
  | ToolbarViewDefinition
  | ToolbarButtonDefinition
  | ToolbarActiveServersDefinition
  | ToolbarSummaryDefinition;

export const toolbarDefinition: readonly ToolbarControlDefinition[] = [
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
