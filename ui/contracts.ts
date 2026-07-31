import type { ReactNode } from 'react';

// --- Generic Presentational Types ---

export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface UiAction {
  actionId: string;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  kind?: 'default' | 'primary' | 'danger';
}

export interface StatusViewModel {
  key: string;
  tone: SemanticTone;
  label?: string;
  badge?: 'default' | 'processing' | 'success' | 'warning' | 'error';
}

export interface AlertViewModel {
  key: string;
  tone: SemanticTone;
  title?: string;
  description?: string;
  value?: string;
}

export interface TagViewModel {
  key: string;
  label?: string;
  value?: string;
  color?: string;
}

export interface TerminalViewModel {
  status?: string;
  lines: readonly string[];
  truncated: boolean;
  maxLines: number;
  title?: string;
  emptyCopy?: string;
  truncatedCopy?: string;
}

export interface CardViewModel {
  id: string;
  name: string;
  status: StatusViewModel;
  alerts: readonly AlertViewModel[];
  tags: readonly TagViewModel[];
  actions: readonly UiAction[];
  terminal: TerminalViewModel;
  url?: string;
}

export interface ActiveServerItem {
  id: string;
  name: string;
  port?: number;
  pid?: number;
  status: StatusViewModel;
  managed: boolean;
  action: UiAction;
}

export interface ToolbarSummaryViewModel {
  visibleCount: number;
  totalCount: number;
  activeCount: number;
}

export interface ToolbarOption {
  label: string;
  value: string;
}

export interface ToolbarControl {
  id: string;
  kind: 'search' | 'select' | 'view' | 'button' | 'active-servers' | 'summary';
  actionId?: string;
  accessibleName?: string;
  placeholder?: string;
  label?: string;
  emptyLabel?: string;
  killLabel?: string;
  killingLabel?: string;
  externalLabel?: string;
  pidLabel?: string;
  visibleLabel?: string;
  totalLabel?: string;
  options?: readonly ToolbarOption[];
  order?: number;
  group?: 'query' | 'actions' | 'status';
  responsivePriority?: number;
}

export interface ToolbarViewModel {
  searchQuery: string;
  sortMode: string;
  viewMode: string;
  summary: ToolbarSummaryViewModel;
  activeServers: readonly ActiveServerItem[];
  actions: readonly UiAction[];
  controls?: readonly ToolbarControl[];
}

export interface HeaderAction {
  id: string;
  actionId: string;
  label: string;
  accessibleName?: string;
  kind?: 'default' | 'primary' | 'danger';
  order?: number;
}

export interface HeaderViewModel {
  title?: string;
  subtitle?: string;
  actions: readonly UiAction[];
  actionDefinitions?: readonly HeaderAction[];
}

export type GridState =
  | {
      state: 'loading';
    }
  | {
      state: 'empty';
    }
  | {
      state: 'ready';
      viewMode: string;
      items: readonly CardViewModel[];
    };

export interface GridProps {
  viewModel: GridState;
  availableActionIds?: readonly string[];
  onAction?: (actionId: string, payload?: unknown) => void;
  loadingLabel?: string;
  emptyLabel?: string;
  emptyCopy?: string;
}

export interface CardProps {
  viewModel: CardViewModel;
  availableActionIds?: readonly string[];
  onAction?: (actionId: string, payload?: unknown) => void;
}

export interface TerminalProps {
  viewModel: TerminalViewModel;
}

export interface ToolbarProps {
  viewModel: ToolbarViewModel;
  availableActionIds?: readonly string[];
  onAction?: (actionId: string, payload?: unknown) => void;
  controls?: readonly ToolbarControl[];
}

export interface HeaderProps {
  viewModel: HeaderViewModel;
  availableActionIds?: readonly string[];
  onAction?: (actionId: string, payload?: unknown) => void;
  title?: string;
  subtitle?: string;
  actions?: readonly HeaderAction[];
  extra?: ReactNode;
}

export interface CoreLayoutProps {
  header?: ReactNode;
  toolbar?: ReactNode;
  content?: ReactNode;
  pageAlert?: ReactNode;
}

export interface DataGridColumnViewModel {
  id: string;
  title: string;
}

export interface DataGridRowViewModel {
  id: string;
  cells: Record<string, string>;
}

export type DataGridSortMode = 'newest' | 'oldest' | 'title-asc' | 'title-desc';

export interface DataGridViewModel {
  columns: DataGridColumnViewModel[];
  rows: DataGridRowViewModel[];
  sortColumn: string | null;
  sortMode: DataGridSortMode;
}

export interface DataGridProps {
  viewModel: DataGridViewModel;
  onAddColumn?: () => void;
  onDeleteColumn?: (id: string) => void;
  onUpdateColumnTitle?: (id: string, title: string) => void;
  onAddRow?: () => void;
  onDeleteRow?: (id: string) => void;
  onUpdateCell?: (rowId: string, columnId: string, text: string) => void;
  onCopyCell?: (text: string) => void;
  onSortChange?: (columnId: string | null, mode: DataGridSortMode) => void;
}
