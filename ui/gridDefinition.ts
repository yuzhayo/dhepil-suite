export type GridLayoutMode = 'grid' | 'list';

export interface GridLayoutDefinition {
  id: GridLayoutMode;
  accessibleLabel: string;
}

export interface GridDefinition {
  skeletonCount: number;
  loadingAccessibleLabel: string;
  emptyAccessibleLabel: string;
  emptyCopy: string;
  cardOrderingPolicyName: string;
  layoutModes: readonly GridLayoutDefinition[];
}

export const gridDefinition: GridDefinition = {
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
