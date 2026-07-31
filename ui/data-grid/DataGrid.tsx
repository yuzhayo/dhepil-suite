import { Button, Input, Popconfirm, Select, Space, Table } from 'antd';
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { TableColumnsType } from 'antd';

import type { DataGridProps, DataGridRowViewModel, DataGridSortMode } from '../contracts';
import { ThemeToggle } from '../theme/ThemeToggle';
import './DataGrid.css';

export function DataGrid({
  viewModel,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumnTitle,
  onAddRow,
  onDeleteRow,
  onUpdateCell,
  onCopyCell,
  onSortChange,
}: DataGridProps) {
  const antdColumns: TableColumnsType<DataGridRowViewModel> = viewModel.columns.map((col) => ({
    title: (
      <div className="core-ui-data-grid__header-cell">
        <Input
          variant="borderless"
          value={col.title}
          onChange={(e) => onUpdateColumnTitle?.(col.id, e.target.value)}
          aria-label={`Title for column ${col.title}`}
        />
        <Popconfirm
          title="Delete column?"
          onConfirm={() => onDeleteColumn?.(col.id)}
          trigger="click"
        >
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            aria-label={`Delete column ${col.title}`}
          />
        </Popconfirm>
      </div>
    ),
    dataIndex: ['cells', col.id],
    key: col.id,
    render: (text: string, row: DataGridRowViewModel) => (
      <Space.Compact style={{ width: '100%', alignItems: 'flex-start' }}>
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 8 }}
          variant="borderless"
          value={text || ''}
          onChange={(e) => onUpdateCell?.(row.id, col.id, e.target.value)}
          aria-label={`Cell in row ${row.id}, column ${col.title}`}
        />
        <Button
          type="primary"
          icon={<CopyOutlined />}
          onClick={() => onCopyCell?.(text || '')}
          aria-label={`Copy cell content`}
        />
      </Space.Compact>
    ),
  }));

  antdColumns.push({
    title: 'Actions',
    key: '_actions',
    width: 80,
    render: (_, row: DataGridRowViewModel) => (
      <Popconfirm title="Delete row?" onConfirm={() => onDeleteRow?.(row.id)} trigger="click">
        <Button danger type="text" icon={<DeleteOutlined />} aria-label="Delete row" />
      </Popconfirm>
    ),
  });

  return (
    <div className="core-ui-data-grid">
      <div className="core-ui-data-grid__toolbar">
        <Space wrap>
          <Select
            value={viewModel.sortColumn || undefined}
            onChange={(val) => onSortChange?.(val, viewModel.sortMode)}
            placeholder="Sort by Column"
            style={{ width: 160 }}
            options={[
              { label: 'None', value: null },
              ...viewModel.columns.map((c) => ({ label: c.title, value: c.id })),
            ]}
          />
          <Select
            value={viewModel.sortMode}
            onChange={(val) => onSortChange?.(viewModel.sortColumn, val as DataGridSortMode)}
            style={{ width: 120 }}
            options={[
              { label: 'Newest', value: 'newest' },
              { label: 'Oldest', value: 'oldest' },
              { label: 'A-Z', value: 'title-asc' },
              { label: 'Z-A', value: 'title-desc' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={onAddColumn}>
            Add Column
          </Button>
          <Button icon={<PlusOutlined />} onClick={onAddRow}>
            Add Row
          </Button>
        </Space>
        <div className="core-ui-data-grid__theme-toggle">
          <ThemeToggle />
        </div>
      </div>

      <Table
        className="core-ui-data-grid__table"
        dataSource={viewModel.rows}
        columns={antdColumns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 'max-content' }}
        bordered
      />
    </div>
  );
}
