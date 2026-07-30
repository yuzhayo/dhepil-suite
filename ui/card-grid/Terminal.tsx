import { useEffect, useRef } from 'react';
import { Typography } from 'antd';

import type { TerminalViewModel } from '../../src/engine/contracts';
import { cardDefinition } from './cardDefinition';
import './Card.css';

const { Text } = Typography;

export interface ProjectTerminalProps {
  viewModel: TerminalViewModel;
}

export function ProjectTerminal({ viewModel }: ProjectTerminalProps) {
  const terminal = cardDefinition.terminal;
  const displayLines = viewModel.status === 'stopped' ? [] : viewModel.lines;
  const content = displayLines.length === 0 ? terminal.emptyCopy : displayLines.join('\n');
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content]);

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
        ref={preRef}
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
