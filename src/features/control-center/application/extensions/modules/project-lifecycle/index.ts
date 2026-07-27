import type { ControlCenterExtension } from '../../contracts';

const projectLifecycleExtension: ControlCenterExtension = {
  schemaVersion: 1,
  id: 'project-lifecycle',
  actions: {
    async 'project.start-open'(context, payload) {
      await context.startAndOpen(projectIdFromPayload(payload));
    },
    async 'project.stop'(context, payload) {
      await context.stop(projectIdFromPayload(payload));
    },
  },
};

function projectIdFromPayload(payload: unknown): string {
  if (typeof payload !== 'string' || payload.length === 0) {
    throw new Error('Action lifecycle membutuhkan project ID string.');
  }
  return payload;
}

export default projectLifecycleExtension;
