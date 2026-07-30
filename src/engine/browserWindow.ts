import type { ProjectWindow, PreparedProjectWindow } from './contracts';

export function browserProjectWindow(): ProjectWindow {
  return {
    prepare(project) {
      const prepared = window.open('about:blank', `dhepil-suite-${project.id}`);
      if (!prepared) {
        return undefined;
      }

      prepared.document.title = `Menyalakan ${project.name}`;
      prepared.document.body.style.cssText =
        'margin:0;min-height:100vh;display:grid;place-items:center;background:#071426;color:#fff;font:16px system-ui';
      prepared.document.body.textContent = `Menyalakan ${project.name}…`;

      return prepared as unknown as PreparedProjectWindow;
    },
    open(url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    },
  };
}
