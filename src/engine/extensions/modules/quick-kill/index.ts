import type { ControlCenterExtension } from '../../contracts';

const quickKillExtension: ControlCenterExtension = {
  schemaVersion: 1,
  id: 'quick-kill',
  actions: {
    async 'project.quick-kill'(context, payload) {
      if (typeof payload !== 'string' || payload.length === 0) {
        throw new Error('Action quick-kill membutuhkan project ID string.');
      }
      await context.quickKill(payload);
    },
  },
};

export default quickKillExtension;
