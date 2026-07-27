import { Alert, Button } from 'antd';

import type { ControlCenterViewModel } from '../../application/view-models';
import { cardDefinition } from '../card/cardDefinition';
import { ProjectGrid } from '../grid/ProjectGrid';
import { ControlCenterHeader } from '../header/ControlCenterHeader';
import { ProjectToolbar } from '../toolbar/ProjectToolbar';
import { toolbarDefinition, type ToolbarButtonDefinition } from '../toolbar/toolbarDefinition';
import './layoutTokens.css';
import './controlCenterLayout.css';

const refreshControl = toolbarDefinition.find(
  (control): control is ToolbarButtonDefinition =>
    control.id === 'project-refresh' && control.kind === 'button',
);

export interface ControlCenterLayoutProps {
  viewModel: ControlCenterViewModel;
  onAction: (actionId: string, payload?: unknown) => void;
}

export function ControlCenterLayout({ viewModel, onAction }: ControlCenterLayoutProps) {
  const pageAlert = viewModel.pageAlert;
  const alertDefinition = pageAlert ? cardDefinition.alerts[pageAlert.key] : undefined;
  const refreshActionState = refreshControl
    ? viewModel.toolbar.actions.find(
        (actionState) => actionState.actionId === refreshControl.actionId,
      )
    : undefined;
  const refreshHandlerAvailable = refreshControl
    ? viewModel.availableActionIds.includes(refreshControl.actionId)
    : false;

  return (
    <main className="control-center-layout" data-scroll-owner="none">
      <div className="control-center-layout__header-shell">
        <ControlCenterHeader
          viewModel={viewModel.header}
          availableActionIds={viewModel.availableActionIds}
          onAction={onAction}
        />
      </div>

      <section
        className="control-center-layout__workspace"
        aria-labelledby="project-list-title"
        data-scroll-owner="none"
      >
        <h2 id="project-list-title" className="sr-only">
          Daftar project
        </h2>

        <ProjectToolbar
          viewModel={viewModel.toolbar}
          availableActionIds={viewModel.availableActionIds}
          onAction={onAction}
        />

        {pageAlert && alertDefinition ? (
          <Alert
            className="control-center-layout__page-alert"
            type={cardDefinition.alertTypes[pageAlert.tone]}
            showIcon
            title={alertDefinition.title}
            description={
              <span className="control-center-layout__alert-description">
                <span>{alertDefinition.description}</span>
                {pageAlert.value ? <span>{pageAlert.value}</span> : null}
              </span>
            }
            action={
              refreshControl ? (
                <Button
                  disabled={!refreshHandlerAvailable || Boolean(refreshActionState?.disabled)}
                  loading={Boolean(refreshActionState?.loading)}
                  onClick={() => onAction(refreshControl.actionId)}
                >
                  Coba lagi
                </Button>
              ) : null
            }
          />
        ) : null}

        <div className="control-center-layout__grid-slot" data-scroll-owner="none">
          <ProjectGrid
            viewModel={viewModel.grid}
            availableActionIds={viewModel.availableActionIds}
            onAction={onAction}
          />
        </div>
      </section>
    </main>
  );
}
