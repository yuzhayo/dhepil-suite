import { createHeaderViewModel } from './createHeaderViewModel';

describe('createHeaderViewModel', () => {
  it('does not invent header actions or static copy in application code', () => {
    expect(createHeaderViewModel()).toEqual({ actions: [] });
  });

  it('preserves semantic action state supplied by application coordination', () => {
    const actions = [
      {
        actionId: 'project.refresh',
        disabled: false,
        loading: true,
      },
    ] as const;

    const viewModel = createHeaderViewModel({ actions });

    expect(viewModel.actions).toEqual(actions);
    expect(viewModel.actions).not.toBe(actions);
  });
});
