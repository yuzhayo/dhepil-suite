import { useEffect, useRef } from 'react';
import { Typography } from 'antd';

import type { TerminalProps } from '../contracts';
import './Card.css';

const { Text } = Typography;

export type { TerminalProps };

export function Terminal({ viewModel }: TerminalProps) {
  const title = viewModel.title ?? 'Output process';
  const emptyCopy = viewModel.emptyCopy ?? 'Belum ada output process.';
  const truncatedCopy = viewModel.truncatedCopy ?? 'Hanya baris log terbaru yang ditampilkan.';

  const displayLines = viewModel.status === 'stopped' ? [] : viewModel.lines;
  const content = displayLines.length === 0 ? emptyCopy : displayLines.join('\n');
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <section className="core-ui-terminal">
      <div className="core-ui-terminal__heading">
        <Text strong>{title}</Text>
        {viewModel.truncated ? (
          <Text className="core-ui-terminal__truncated" type="secondary">
            {truncatedCopy} Maksimum {viewModel.maxLines} baris.
          </Text>
        ) : null}
      </div>
      <pre
        ref={preRef}
        className="core-ui-terminal__content"
        aria-label={title}
        aria-live="polite"
        tabIndex={0}
      >
        {content}
      </pre>
    </section>
  );
}
