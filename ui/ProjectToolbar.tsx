import { Button, Dropdown, Input, Segmented, Select, Typography } from 'antd';
import type { MenuProps } from 'antd';

import type {
  ActiveServerItemViewModel,
  ToolbarViewModel,
  UiActionViewModel,
} from '../src/engine/contracts';
import {
  toolbarDefinition,
  type ToolbarActiveServersDefinition,
  type ToolbarControlDefinition,
} from './toolbarDefinition';
import './ProjectToolbar.css';

const { Text } = Typography;

export interface ProjectToolbarProps {
  viewModel: ToolbarViewModel;
  availableActionIds: readonly string[];
  onAction: (actionId: string, payload?: unknown) => void;
}

interface ToolbarRenderContext extends ProjectToolbarProps {
  availableActions: ReadonlySet<string>;
  actionStates: ReadonlyMap<string, UiActionViewModel>;
}

export function ProjectToolbar(props: ProjectToolbarProps) {
  const context: ToolbarRenderContext = {
    ...props,
    availableActions: new Set(props.availableActionIds),
    actionStates: new Map(
      props.viewModel.actions.map((actionState) => [actionState.actionId, actionState]),
    ),
  };
  const controls = [...toolbarDefinition].sort((left, right) => left.order - right.order);

  return (
    <section className="project-toolbar-ui" role="search" aria-label="Cari dan atur project">
      {controls.map((control) => (
        <div
          key={control.id}
          className={`project-toolbar-ui__control project-toolbar-ui__control--${control.kind}`}
          data-toolbar-control-id={control.id}
          data-toolbar-group={control.group}
          data-responsive-priority={control.responsivePriority}
        >
          {renderControl(control, context)}
        </div>
      ))}
    </section>
  );
}

function renderControl(
  control: ToolbarControlDefinition,
  context: ToolbarRenderContext,
): React.ReactNode {
  switch (control.kind) {
    case 'search':
      return (
        <Input
          allowClear
          aria-label={control.accessibleName}
          disabled={isActionDisabled(control.actionId, context)}
          placeholder={control.placeholder}
          value={context.viewModel.searchQuery}
          onChange={(event) => context.onAction(control.actionId, event.target.value)}
        />
      );
    case 'select':
      return (
        <Select
          aria-label={control.accessibleName}
          disabled={isActionDisabled(control.actionId, context)}
          options={[...control.options]}
          value={context.viewModel.sortMode}
          onChange={(value) => context.onAction(control.actionId, value)}
        />
      );
    case 'view':
      return (
        <Segmented
          aria-label={control.accessibleName}
          disabled={isActionDisabled(control.actionId, context)}
          options={[...control.options]}
          value={context.viewModel.viewMode}
          onChange={(value) => context.onAction(control.actionId, value)}
        />
      );
    case 'button': {
      const actionState = context.actionStates.get(control.actionId);
      return (
        <Button
          aria-label={control.accessibleName}
          disabled={isActionDisabled(control.actionId, context)}
          loading={Boolean(actionState?.loading)}
          onClick={() => context.onAction(control.actionId)}
        >
          {control.label}
        </Button>
      );
    }
    case 'active-servers':
      return renderActiveServers(control, context);
    case 'summary':
      return (
        <Text className="project-toolbar-ui__summary" aria-live="polite">
          <span className="project-toolbar-ui__summary-label">{control.accessibleName}: </span>
          {context.viewModel.summary.visibleCount} {control.visibleLabel} ·{' '}
          {context.viewModel.summary.totalCount} {control.totalLabel}
        </Text>
      );
  }
}

function renderActiveServers(
  control: ToolbarActiveServersDefinition,
  context: ToolbarRenderContext,
) {
  const handlerAvailable = context.availableActions.has(control.actionId);
  const items: MenuProps['items'] =
    context.viewModel.activeServers.length === 0
      ? [{ key: 'no-active-server', disabled: true, label: control.emptyLabel }]
      : context.viewModel.activeServers.map((server) => ({
          key: server.id,
          danger: handlerAvailable && !server.action.disabled,
          disabled:
            !handlerAvailable ||
            server.action.actionId !== control.actionId ||
            server.action.disabled,
          label: renderActiveServerLabel(server, control),
        }));

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    const server = context.viewModel.activeServers.find((candidate) => candidate.id === key);
    if (
      server &&
      handlerAvailable &&
      server.action.actionId === control.actionId &&
      !server.action.disabled
    ) {
      context.onAction(control.actionId, server.id);
    }
  };

  return (
    <Dropdown menu={{ items, onClick: onMenuClick }} placement="bottomRight" trigger={['click']}>
      <Button
        aria-label={`${control.label} (${context.viewModel.summary.activeCount}) ▾`}
        disabled={!handlerAvailable}
      >
        {control.label} ({context.viewModel.summary.activeCount}) ▾
      </Button>
    </Dropdown>
  );
}

function renderActiveServerLabel(
  server: ActiveServerItemViewModel,
  definition: ToolbarActiveServersDefinition,
) {
  const processLabel =
    server.pid === undefined
      ? definition.externalLabel.toLowerCase()
      : `${definition.pidLabel} ${server.pid}`;

  return (
    <span className="project-toolbar-ui__server">
      <span>
        <strong>{server.name}</strong>
        <small>
          {server.port === undefined ? '' : `:${server.port}`} · {processLabel}
        </small>
      </span>
      <span
        className={
          server.managed
            ? 'project-toolbar-ui__kill'
            : 'project-toolbar-ui__kill project-toolbar-ui__kill--external'
        }
      >
        {server.managed
          ? server.action.loading
            ? definition.killingLabel
            : definition.killLabel
          : definition.externalLabel}
      </span>
    </span>
  );
}

function isActionDisabled(actionId: string, context: ToolbarRenderContext): boolean {
  return (
    !context.availableActions.has(actionId) || Boolean(context.actionStates.get(actionId)?.disabled)
  );
}
