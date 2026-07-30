import { App as AntdApp } from 'antd';
import { DataGrid } from '../../../ui/data-grid/DataGrid';
import { useClipboardEngine } from './engine/useClipboardEngine';

export function ClipboardGate() {
  const engine = useClipboardEngine();
  const { message } = AntdApp.useApp();

  const handleCopyCell = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      message.success('Teks disalin!');
    } catch {
      message.error('Gagal menyalin teks.');
    }
  };

  return (
    <DataGrid
      viewModel={engine.viewModel}
      onAddColumn={engine.addColumn}
      onDeleteColumn={engine.deleteColumn}
      onUpdateColumnTitle={engine.updateColumnTitle}
      onAddRow={engine.addRow}
      onDeleteRow={engine.deleteRow}
      onUpdateCell={engine.updateCell}
      onCopyCell={handleCopyCell}
      onSortChange={engine.handleSortChange}
    />
  );
}
