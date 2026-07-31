import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DataGridViewModel, DataGridSortMode } from '../../../../ui/contracts';
import type { ClipboardColumn, ClipboardRow } from './types';

const STORAGE_KEY = 'clipboard-data';

interface StorageData {
  columns: ClipboardColumn[];
  rows: ClipboardRow[];
}

export function useClipboardEngine() {
  const [columns, setColumns] = useState<ClipboardColumn[]>(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as StorageData;
        return parsed.columns || [];
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [rows, setRows] = useState<ClipboardRow[]>(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as StorageData;
        return parsed.rows || [];
      }
    } catch {
      // Ignore
    }
    return [];
  });

  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<DataGridSortMode>('newest');

  // Debounced LocalStorage save
  useEffect(() => {
    const handler = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ columns, rows }));
    }, 500);

    return () => clearTimeout(handler);
  }, [columns, rows]);

  // Handlers
  const addColumn = useCallback(() => {
    setColumns((prev) => [...prev, { id: crypto.randomUUID(), title: `Kolom ${prev.length + 1}` }]);
  }, []);

  const deleteColumn = useCallback((id: string) => {
    setColumns((prev) => prev.filter((col) => col.id !== id));
    // Clean up cells data for that column
    setRows((prev) =>
      prev.map((row) => {
        const newCells = { ...row.cells };
        delete newCells[id];
        return { ...row, cells: newCells };
      }),
    );
  }, []);

  const updateColumnTitle = useCallback((id: string, title: string) => {
    setColumns((prev) => prev.map((col) => (col.id === id ? { ...col, title } : col)));
  }, []);

  const addRow = useCallback(() => {
    setRows((prev) => [
      {
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        cells: {},
      },
      ...prev,
    ]);
  }, []);

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const updateCell = useCallback((rowId: string, columnId: string, text: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            updatedAt: Date.now(),
            cells: {
              ...row.cells,
              [columnId]: text,
            },
          };
        }
        return row;
      }),
    );
  }, []);

  const handleSortChange = useCallback((columnId: string | null, mode: DataGridSortMode) => {
    setSortColumn(columnId);
    setSortMode(mode);
  }, []);

  // Memoized sorting
  const sortedRows = useMemo(() => {
    const arr = [...rows];

    if (sortMode === 'newest') {
      arr.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === 'oldest') {
      arr.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortColumn) {
      arr.sort((a, b) => {
        const textA = a.cells[sortColumn] || '';
        const textB = b.cells[sortColumn] || '';
        const cmp = textA.localeCompare(textB);
        return sortMode === 'title-asc' ? cmp : -cmp;
      });
    }

    return arr;
  }, [rows, sortColumn, sortMode]);

  // View Model mapping
  const viewModel: DataGridViewModel = {
    columns: columns.map((col) => ({ id: col.id, title: col.title })),
    rows: sortedRows.map((row) => ({ id: row.id, cells: row.cells })),
    sortColumn,
    sortMode,
  };

  return {
    viewModel,
    addColumn,
    deleteColumn,
    updateColumnTitle,
    addRow,
    deleteRow,
    updateCell,
    handleSortChange,
  };
}
