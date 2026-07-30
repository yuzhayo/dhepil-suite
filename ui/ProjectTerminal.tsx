import { Typography } from 'antd';

import type { TerminalViewModel } from '../src/features/control-center/application/view-models';
import { cardDefinition } from './cardDefinition';
import './ProjectCard.css';

const { Text } = Typography;

export interface ProjectTerminalProps {
  viewModel: TerminalViewModel;
}

export function ProjectTerminal({ viewModel }: ProjectTerminalProps) {
  const terminal = cardDefinition.terminal;
  const content = viewModel.lines.length === 0 ? terminal.emptyCopy : viewModel.lines.join('\n');

  return (
    <section className="project-terminal">
      <div className="project-terminal__heading">
        <Text strong>{terminal.title}</Text>
        {viewModel.truncated ? (
          <Text className="project-terminal__truncated" type="secondary">
            {terminal.truncatedCopy} Maksimum {viewModel.maxLines} baris.
          </Text>
        ) : null}
      </div>
      <pre
        className="project-terminal__content"
        aria-label={terminal.accessibleName}
        aria-live="polite"
        tabIndex={0}
      >
        {content}
      </pre>
    </section>
  );
}
