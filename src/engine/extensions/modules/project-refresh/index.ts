import type { ControlCenterExtension } from '../../contracts';

const projectRefreshExtension: ControlCenterExtension = {
  schemaVersion: 1,
  id: 'project-refresh',
  actions: {
    async 'project.refresh'(context) {
      await context.refresh();
    },
  },
};

export default projectRefreshExtension;
