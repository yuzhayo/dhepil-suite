import { Button, Typography } from 'antd';

import type { HeaderProps } from '../contracts';
import './Header.css';

const { Paragraph, Title } = Typography;

export type { HeaderProps };

export function Header({
  viewModel,
  availableActionIds,
  onAction,
  title,
  subtitle,
  actions,
  extra,
}: HeaderProps) {
  const availableActions = new Set(availableActionIds);
  const actionStates = new Map(
    viewModel.actions.map((actionState) => [actionState.actionId, actionState]),
  );

  const displayTitle = title ?? viewModel.title;
  const displaySubtitle = subtitle ?? viewModel.subtitle;
  const displayActions = actions ?? viewModel.actionDefinitions ?? [];
  const sortedActions = [...displayActions].sort(
    (left, right) => (left.order ?? 0) - (right.order ?? 0),
  );

  return (
    <header className="core-ui-header">
      <div className="core-ui-header__content">
        {displayTitle ? (
          <Title className="core-ui-header__title" level={1}>
            {displayTitle}
          </Title>
        ) : null}
        {displaySubtitle ? (
          <Paragraph className="core-ui-header__subtitle">{displaySubtitle}</Paragraph>
        ) : null}
      </div>

      {sortedActions.length > 0 || extra ? (
        <div className="core-ui-header__actions" aria-label="Aksi header">
          {extra}
          {sortedActions.map((action) => {
            const state = actionStates.get(action.actionId);
            const handlerAvailable =
              availableActionIds === undefined || availableActions.has(action.actionId);

            return (
              <Button
                key={action.id}
                aria-label={action.accessibleName ?? action.label}
                danger={action.kind === 'danger'}
                disabled={!handlerAvailable || Boolean(state?.disabled)}
                loading={Boolean(state?.loading)}
                type={action.kind === 'primary' ? 'primary' : 'default'}
                onClick={() => onAction?.(action.actionId)}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
