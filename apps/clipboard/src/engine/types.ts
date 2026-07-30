export interface ClipboardColumn {
  id: string;
  title: string;
}

export interface ClipboardRow {
  id: string;
  createdAt: number;
  updatedAt: number;
  cells: Record<string, string>;
}
