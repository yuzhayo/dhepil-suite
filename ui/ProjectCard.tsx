import { Alert, Badge, Button, Card, Tag, Typography } from 'antd';

import type {
  AlertViewModel,
  CardActionViewModel,
  ProjectCardViewModel,
  TagViewModel,
} from '../src/features/control-center/application/view-models';
import { cardDefinition, type CardActionDefinition } from './cardDefinition';
import { ProjectTerminal } from './ProjectTerminal';
import './ProjectCard.css';

const { Text, Title } = Typography;

export interface ProjectCardProps {
  viewModel: ProjectCardViewModel;
  availableActionIds: readonly string[];
  onAction: (actionId: string, payload?: unknown) => void;
}

export function ProjectCard({ viewModel, availableActionIds, onAction }: ProjectCardProps) {
  const status = cardDefinition.statuses[viewModel.status.key];
  const availableActions = new Set(availableActionIds);
  const actionStates = new Map(
    viewModel.actions.map((actionState) => [actionState.actionId, actionState]),
  );
  const actions = [...cardDefinition.actions].sort((left, right) => left.order - right.order);

  return (
    <Card
      className="project-card-ui"
      role="article"
      aria-label={`Project ${viewModel.name}`}
      title={
        <Title className="project-card-ui__title" level={3}>
          {viewModel.name}
        </Title>
      }
      extra={<Badge status={status.badge} text={status.label} />}
      variant="outlined"
    >
      <div className="project-card-ui__actions" aria-label={`Aksi ${viewModel.name}`}>
        {actions.map((definition) =>
          renderAction(
            definition,
            viewModel,
            actionStates.get(definition.actionId),
            availableActions,
            onAction,
          ),
        )}
      </div>

      {viewModel.tags.length > 0 ? (
        <div className="project-card-ui__tags" aria-label={`Metadata ${viewModel.name}`}>
          {viewModel.tags.map((tag, index) => renderTag(tag, index))}
        </div>
      ) : null}

      {viewModel.alerts.length > 0 ? (
        <div className="project-card-ui__alerts">
          {viewModel.alerts.map((alert, index) => renderAlert(alert, index))}
        </div>
      ) : null}

      <ProjectTerminal viewModel={viewModel.terminal} />
    </Card>
  );
}

function renderAction(
  definition: CardActionDefinition,
  project: ProjectCardViewModel,
  state: CardActionViewModel | undefined,
  availableActions: ReadonlySet<string>,
  onAction: ProjectCardProps['onAction'],
) {
  const handlerAvailable = availableActions.has(definition.actionId);
  const disabled = !handlerAvailable || !state || state.disabled;
  const label = definition.labelByStatus?.[project.status.key] ?? definition.defaultLabel;

  return (
    <Button
      key={definition.id}
      aria-label={label}
      danger={definition.kind === 'danger'}
      disabled={disabled}
      loading={Boolean(state?.loading)}
      type={definition.kind === 'primary' ? 'primary' : 'default'}
      onClick={() => onAction(definition.actionId, project.id)}
    >
      {label}
    </Button>
  );
}

function renderTag(tag: TagViewModel, index: number) {
  const definition = cardDefinition.tags[tag.key];
  const value = definition.showValue && tag.value ? ` ${tag.value}` : '';

  return (
    <Tag key={`${tag.key}-${tag.value ?? index}`} color={definition.color} variant="filled">
      {definition.label}
      {value}
    </Tag>
  );
}

function renderAlert(alert: AlertViewModel, index: number) {
  const definition = cardDefinition.alerts[alert.key];

  return (
    <Alert
      key={`${alert.key}-${index}`}
      className="project-card-ui__alert"
      type={cardDefinition.alertTypes[alert.tone]}
      showIcon
      title={definition.title}
      description={
        <span className="project-card-ui__alert-description">
          <span>{definition.description}</span>
          {alert.value ? <Text code>{alert.value}</Text> : null}
        </span>
      }
    />
  );
}
