import type { ProjectSortMode, ProjectViewMode } from '../../../engine';
import type { ProjectStatus } from '../../../engine';

export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export type StatusKey = ProjectStatus;

export type AlertKey =
  | 'startup-failed'
  | 'port-conflict'
  | 'invalid-config'
  | 'project-not-found'
  | 'process-error'
  | 'page-error';

export type TagKey = 'managed' | 'external' | 'tombstone' | 'port' | 'pid' | 'path' | 'desktop';

export interface UiActionViewModel {
  actionId: string;
  disabled: boolean;
  loading: boolean;
}

export type CardActionViewModel = UiActionViewModel;

export interface StatusViewModel {
  key: StatusKey;
  tone: SemanticTone;
}

export interface AlertViewModel {
  key: AlertKey;
  tone: SemanticTone;
  value?: string;
}

export interface TagViewModel {
  key: TagKey;
  value?: string;
}

export interface TerminalViewModel {
  lines: readonly string[];
  truncated: boolean;
  maxLines: number;
}

export interface ProjectCardViewModel {
  id: string;
  name: string;
  status: StatusViewModel;
  alerts: readonly AlertViewModel[];
  tags: readonly TagViewModel[];
  actions: readonly CardActionViewModel[];
  terminal: TerminalViewModel;
  url?: string;
}

export interface ActiveServerItemViewModel {
  id: string;
  name: string;
  port?: number;
  pid?: number;
  status: StatusViewModel;
  managed: boolean;
  action: CardActionViewModel;
}

export interface ToolbarSummaryViewModel {
  visibleCount: number;
  totalCount: number;
  activeCount: number;
}

export interface ToolbarViewModel {
  searchQuery: string;
  sortMode: ProjectSortMode;
  viewMode: ProjectViewMode;
  summary: ToolbarSummaryViewModel;
  activeServers: readonly ActiveServerItemViewModel[];
  actions: readonly UiActionViewModel[];
}

export type ProjectGridViewModel =
  | {
      state: 'loading';
    }
  | {
      state: 'empty';
    }
  | {
      state: 'ready';
      viewMode: ProjectViewMode;
      projects: readonly ProjectCardViewModel[];
    };

export interface HeaderViewModel {
  actions: readonly UiActionViewModel[];
}

export interface ControlCenterViewModel {
  header: HeaderViewModel;
  toolbar: ToolbarViewModel;
  grid: ProjectGridViewModel;
  availableActionIds: readonly string[];
  pageAlert?: AlertViewModel;
}
