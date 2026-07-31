import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  openFolder: (dir: string): Promise<void> => ipcRenderer.invoke('open-folder', dir),
});
