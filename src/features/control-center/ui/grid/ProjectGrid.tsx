import { Empty, Skeleton } from 'antd';

import type { ProjectGridViewModel } from '../../application/view-models';
import { ProjectCard } from '../card/ProjectCard';
import { gridDefinition } from './gridDefinition';
import './ProjectGrid.css';

export interface ProjectGridProps {
  viewModel: ProjectGridViewModel;
  availableActionIds: readonly string[];
  onAction: (actionId: string, payload?: unknown) => void;
}

export function ProjectGrid({ viewModel, availableActionIds, onAction }: ProjectGridProps) {
  if (viewModel.state === 'loading') {
    return (
      <section
        className="project-grid-ui project-grid-ui--loading"
        aria-label={gridDefinition.loadingAccessibleLabel}
      >
        <div className="project-grid-ui__collection project-grid-ui__collection--grid">
          {Array.from({ length: gridDefinition.skeletonCount }, (_, index) => (
            <div
              key={`project-skeleton-${index + 1}`}
              className="project-grid-ui__skeleton"
              data-grid-skeleton
            >
              <Skeleton active />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (viewModel.state === 'empty') {
    return (
      <section
        className="project-grid-ui project-grid-ui--empty"
        aria-label={gridDefinition.emptyAccessibleLabel}
      >
        <Empty
          className="project-grid-ui__empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={gridDefinition.emptyCopy}
        />
      </section>
    );
  }

  const layout =
    gridDefinition.layoutModes.find((candidate) => candidate.id === viewModel.viewMode) ??
    gridDefinition.layoutModes[0];

  return (
    <section
      className="project-grid-ui"
      aria-label={layout.accessibleLabel}
      data-card-ordering-policy={gridDefinition.cardOrderingPolicyName}
    >
      <div
        className={`project-grid-ui__collection project-grid-ui__collection--${viewModel.viewMode}`}
      >
        {viewModel.projects.map((project) => (
          <ProjectCard
            key={project.id}
            viewModel={project}
            availableActionIds={availableActionIds}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}
