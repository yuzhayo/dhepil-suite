import { Button, Typography } from 'antd';

import type { HeaderViewModel } from '../../application/view-models';
import { headerDefinition, type HeaderActionKind } from './headerDefinition';
import './ControlCenterHeader.css';

const { Paragraph, Title } = Typography;

export interface ControlCenterHeaderProps {
  viewModel: HeaderViewModel;
  availableActionIds: readonly string[];
  onAction: (actionId: string) => void;
}

export function ControlCenterHeader({
  viewModel,
  availableActionIds,
  onAction,
}: ControlCenterHeaderProps) {
  const availableActions = new Set(availableActionIds);
  const actionStates = new Map(
    viewModel.actions.map((actionState) => [actionState.actionId, actionState]),
  );
  const actions = [...headerDefinition.actions].sort((left, right) => left.order - right.order);

  return (
    <header className="control-center-ui-header">
      <div className="control-center-ui-header__content">
        <Title className="control-center-ui-header__title" level={1}>
          {headerDefinition.title}
        </Title>
        <Paragraph className="control-center-ui-header__subtitle">
          {headerDefinition.subtitle}
        </Paragraph>
      </div>

      <div className="control-center-ui-header__actions" aria-label="Aksi control center">
        {actions.map((action) => {
          const state = actionStates.get(action.actionId);
          const handlerAvailable = availableActions.has(action.actionId);

          return (
            <Button
              key={action.id}
              aria-label={action.accessibleName}
              danger={action.kind === 'danger'}
              disabled={!handlerAvailable || Boolean(state?.disabled)}
              loading={Boolean(state?.loading)}
              type={toButtonType(action.kind)}
              onClick={() => onAction(action.actionId)}
            >
              {action.label}
            </Button>
          );
        })}
      </div>
    </header>
  );
}

function toButtonType(kind: HeaderActionKind): 'default' | 'primary' {
  return kind === 'primary' ? 'primary' : 'default';
}
