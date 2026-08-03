import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Badge, Button, Card as AntCard, Popover, Tag, Typography } from 'antd';

import type { AlertViewModel, CardProps, TagViewModel, UiAction } from '../contracts';
import { Terminal } from './Terminal';
import './Card.css';

const { Text, Title } = Typography;

export type { CardProps };

export function Card({ viewModel, availableActionIds = [], onAction = () => {} }: CardProps) {
  const availableActions = new Set(availableActionIds);
  const statusBadge =
    viewModel.status.badge ?? toBadgeStatus(viewModel.status.key, viewModel.status.tone);
  const statusLabel = viewModel.status.label ?? viewModel.status.key;

  return (
    <AntCard
      className="core-ui-card"
      role="article"
      aria-label={`Project ${viewModel.name}`}
      title={
        <Title className="core-ui-card__title" level={3}>
          {viewModel.name}
        </Title>
      }
      extra={
        <div className="core-ui-card__extra">
          {viewModel.tags.length > 0 ? (
            <Popover
              content={
                <div className="core-ui-card__metadata" aria-label={`Metadata ${viewModel.name}`}>
                  {viewModel.tags.map((tag, index) => renderTag(tag, index))}
                </div>
              }
              title={`Detail ${viewModel.name}`}
              trigger="click"
            >
              <Button
                className="core-ui-card__info-button"
                aria-label={`Informasi ${viewModel.name}`}
                icon={<InfoCircleOutlined />}
                shape="circle"
                size="small"
                type="text"
              />
            </Popover>
          ) : null}
          <Badge status={statusBadge} text={statusLabel} />
        </div>
      }
      variant="outlined"
    >
      <div className="core-ui-card__actions" aria-label={`Aksi ${viewModel.name}`}>
        {viewModel.actions.map((action) =>
          renderAction(action, viewModel, availableActions, onAction),
        )}
      </div>

      {viewModel.alerts.length > 0 ? (
        <div className="core-ui-card__alerts">
          {viewModel.alerts.map((alert, index) => renderAlert(alert, index))}
        </div>
      ) : null}

      <Terminal viewModel={viewModel.terminal} />
    </AntCard>
  );
}

function renderAction(
  action: UiAction,
  item: CardProps['viewModel'],
  availableActions: ReadonlySet<string>,
  onAction: CardProps['onAction'],
) {
  const handlerAvailable = availableActions.size === 0 || availableActions.has(action.actionId);
  const disabled = !handlerAvailable || Boolean(action.disabled);
  const label = action.label ?? action.actionId;

  return (
    <Button
      key={action.actionId}
      aria-label={label}
      danger={action.kind === 'danger'}
      disabled={disabled}
      loading={Boolean(action.loading)}
      type={action.kind === 'primary' ? 'primary' : 'default'}
      onClick={() => onAction?.(action.actionId, item.id)}
    >
      {label}
    </Button>
  );
}

function renderTag(tag: TagViewModel, index: number) {
  const label = tag.label ?? tag.key;
  const value = tag.value ? ` ${tag.value}` : '';

  return (
    <Tag key={`${tag.key}-${tag.value ?? index}`} color={tag.color ?? 'default'} variant="filled">
      {label}
      {value}
    </Tag>
  );
}

function renderAlert(alert: AlertViewModel, index: number) {
  const alertType = toAlertType(alert.tone);
  const title = alert.title ?? alert.key;

  return (
    <Alert
      key={`${alert.key}-${index}`}
      className="core-ui-card__alert"
      type={alertType}
      showIcon
      title={title}
      description={
        alert.description || alert.value ? (
          <span className="core-ui-card__alert-description">
            {alert.description ? <span>{alert.description}</span> : null}
            {alert.value ? <Text code>{alert.value}</Text> : null}
          </span>
        ) : undefined
      }
    />
  );
}

function toBadgeStatus(
  key: string,
  tone: string,
): 'default' | 'processing' | 'success' | 'warning' | 'error' {
  if (tone === 'success') return 'success';
  if (tone === 'info') return 'processing';
  if (tone === 'warning') return 'warning';
  if (tone === 'danger') return 'error';
  return 'default';
}

function toAlertType(tone: string): 'info' | 'success' | 'warning' | 'error' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'danger') return 'error';
  return 'info';
}
