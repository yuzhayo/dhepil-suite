import React from 'react';
import { Button, Dropdown, Input, Segmented, Select, Typography } from 'antd';
import type { MenuProps } from 'antd';

import type { ActiveServerItem, ToolbarControl, ToolbarProps, UiAction } from '../contracts';
import './Toolbar.css';

const { Text } = Typography;

export type { ToolbarProps };

interface ToolbarRenderContext {
  viewModel: ToolbarProps['viewModel'];
  availableActions: ReadonlySet<string>;
  actionStates: ReadonlyMap<string, UiAction>;
  onAction: (actionId: string, payload?: unknown) => void;
}

export function Toolbar({
  viewModel,
  availableActionIds = [],
  onAction = () => {},
  controls = viewModel.controls ?? [],
}: ToolbarProps) {
  const context: ToolbarRenderContext = {
    viewModel,
    availableActions: new Set(availableActionIds),
    actionStates: new Map(
      viewModel.actions.map((actionState) => [actionState.actionId, actionState]),
    ),
    onAction,
  };
  const sortedControls = [...controls].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );

  return (
    <section className="core-ui-toolbar" role="search" aria-label="Toolbar controls">
      {sortedControls.map((control) => (
        <div
          key={control.id}
          className={`core-ui-toolbar__control core-ui-toolbar__control--${control.kind}`}
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

function renderControl(control: ToolbarControl, context: ToolbarRenderContext): React.ReactNode {
  const actionId = control.actionId ?? '';

  switch (control.kind) {
    case 'search':
      return (
        <Input
          allowClear
          aria-label={control.accessibleName ?? 'Search'}
          disabled={isActionDisabled(actionId, context)}
          placeholder={control.placeholder}
          value={context.viewModel.searchQuery}
          onChange={(event) => context.onAction(actionId, event.target.value)}
        />
      );
    case 'select':
      return (
        <Select
          aria-label={control.accessibleName ?? 'Select'}
          disabled={isActionDisabled(actionId, context)}
          options={control.options ? [...control.options] : []}
          value={context.viewModel.sortMode}
          onChange={(value) => context.onAction(actionId, value)}
        />
      );
    case 'view':
      return (
        <Segmented
          aria-label={control.accessibleName ?? 'View mode'}
          disabled={isActionDisabled(actionId, context)}
          options={control.options ? [...control.options] : []}
          value={context.viewModel.viewMode}
          onChange={(value) => context.onAction(actionId, value)}
        />
      );
    case 'button': {
      const actionState = context.actionStates.get(actionId);
      return (
        <Button
          aria-label={control.accessibleName ?? control.label}
          disabled={isActionDisabled(actionId, context)}
          loading={Boolean(actionState?.loading)}
          onClick={() => context.onAction(actionId)}
        >
          {control.label}
        </Button>
      );
    }
    case 'active-servers':
      return renderActiveServers(control, context);
    case 'summary':
      return (
        <Text className="core-ui-toolbar__summary" aria-live="polite">
          <span className="core-ui-toolbar__summary-label">
            {control.accessibleName ?? 'Summary'}:{' '}
          </span>
          {context.viewModel.summary.visibleCount} {control.visibleLabel ?? 'visible'} ·{' '}
          {context.viewModel.summary.totalCount} {control.totalLabel ?? 'total'}
        </Text>
      );
  }
}

function renderActiveServers(control: ToolbarControl, context: ToolbarRenderContext) {
  const actionId = control.actionId ?? '';
  const handlerAvailable = context.availableActions.has(actionId);
  const items: MenuProps['items'] =
    context.viewModel.activeServers.length === 0
      ? [
          {
            key: 'no-active-server',
            disabled: true,
            label: control.emptyLabel ?? 'No active items',
          },
        ]
      : context.viewModel.activeServers.map((server) => ({
          key: server.id,
          danger: handlerAvailable && !server.action.disabled,
          disabled:
            !handlerAvailable ||
            (server.action.actionId && server.action.actionId !== actionId) ||
            server.action.disabled,
          label: renderActiveServerLabel(server, control),
        }));

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    const server = context.viewModel.activeServers.find((candidate) => candidate.id === key);
    if (
      server &&
      handlerAvailable &&
      (!server.action.actionId || server.action.actionId === actionId) &&
      !server.action.disabled
    ) {
      context.onAction(actionId, server.id);
    }
  };

  return (
    <Dropdown menu={{ items, onClick: onMenuClick }} placement="bottomRight" trigger={['click']}>
      <Button
        aria-label={`${control.label ?? 'Active'} (${context.viewModel.summary.activeCount}) ▾`}
        disabled={!handlerAvailable}
      >
        {control.label ?? 'Active'} ({context.viewModel.summary.activeCount}) ▾
      </Button>
    </Dropdown>
  );
}

function renderActiveServerLabel(server: ActiveServerItem, definition: ToolbarControl) {
  const processLabel =
    server.pid === undefined
      ? (definition.externalLabel ?? 'external').toLowerCase()
      : `${definition.pidLabel ?? 'PID'} ${server.pid}`;

  return (
    <span className="core-ui-toolbar__server">
      <span>
        <strong>{server.name}</strong>
        <small>
          {server.port === undefined ? '' : `:${server.port}`} · {processLabel}
        </small>
      </span>
      <span
        className={
          server.managed
            ? 'core-ui-toolbar__kill'
            : 'core-ui-toolbar__kill core-ui-toolbar__kill--external'
        }
      >
        {server.managed
          ? server.action.loading
            ? (definition.killingLabel ?? 'Stopping…')
            : (definition.killLabel ?? 'Kill')
          : (definition.externalLabel ?? 'External')}
      </span>
    </span>
  );
}

function isActionDisabled(actionId: string, context: ToolbarRenderContext): boolean {
  if (!actionId) return false;
  if (!context.availableActions.has(actionId)) return true;
  return Boolean(context.actionStates.get(actionId)?.disabled);
}
