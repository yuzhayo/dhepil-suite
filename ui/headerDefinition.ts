export type HeaderActionKind = 'default' | 'primary' | 'danger';

export interface HeaderActionDefinition {
  id: string;
  label: string;
  accessibleName: string;
  actionId: string;
  kind: HeaderActionKind;
  order: number;
}

export interface HeaderDefinition {
  title: string;
  subtitle: string;
  actions: readonly HeaderActionDefinition[];
}

export const headerDefinition: HeaderDefinition = {
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
  ],
};
