import { Empty, Skeleton } from 'antd';

import type { GridProps } from '../contracts';
import { Card } from './Card';
import './CardGrid.css';

export type { GridProps };

export function Grid({
  viewModel,
  availableActionIds = [],
  onAction = () => {},
  loadingLabel = 'Memuat data',
  emptyLabel = 'Daftar kosong',
  emptyCopy = 'Tidak ada item ditemukan',
}: GridProps) {
  if (viewModel.state === 'loading') {
    return (
      <section
        className="core-ui-grid core-ui-grid__collection core-ui-grid__collection--grid core-ui-grid--loading"
        aria-label={loadingLabel}
      >
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={`grid-skeleton-${index + 1}`}
            className="core-ui-grid__skeleton"
            data-grid-skeleton
          >
            <Skeleton active />
          </div>
        ))}
      </section>
    );
  }

  if (viewModel.state === 'empty' || !viewModel.items || viewModel.items.length === 0) {
    return (
      <section className="core-ui-grid core-ui-grid--empty" aria-label={emptyLabel}>
        <Empty
          className="core-ui-grid__empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyCopy}
        />
      </section>
    );
  }

  const viewMode = viewModel.viewMode ?? 'grid';

  return (
    <section
      className={`core-ui-grid core-ui-grid__collection core-ui-grid__collection--${viewMode}`}
      aria-label={`Daftar project mode ${viewMode}`}
      data-card-ordering-policy="view-model-order"
    >
      {viewModel.items.map((item) => (
        <Card
          key={item.id}
          viewModel={item}
          availableActionIds={availableActionIds}
          onAction={onAction}
        />
      ))}
    </section>
  );
}
