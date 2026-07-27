import { fireEvent, render, screen } from '@testing-library/react';

import { useControlCenterController } from '../application/controller/useControlCenterController';
import type { ControlCenterViewModel } from '../application/view-models';
import { ControlCenterScreen } from './ControlCenterScreen';

vi.mock('../application/controller/useControlCenterController', () => ({
  useControlCenterController: vi.fn(),
}));

const dispatch = vi.fn();
const viewModel: ControlCenterViewModel = {
  header: {
    actions: [{ actionId: 'project.refresh', disabled: false, loading: false }],
  },
  toolbar: {
    searchQuery: '',
    sortMode: 'name-asc',
    viewMode: 'grid',
    summary: { visibleCount: 0, totalCount: 0, activeCount: 0 },
    activeServers: [],
    actions: [
      { actionId: 'project.search.change', disabled: false, loading: false },
      { actionId: 'project.sort.change', disabled: false, loading: false },
      { actionId: 'project.view.change', disabled: false, loading: false },
      { actionId: 'project.refresh', disabled: false, loading: false },
    ],
  },
  grid: { state: 'empty' },
  availableActionIds: [
    'project.refresh',
    'project.search.change',
    'project.sort.change',
    'project.view.change',
  ],
};

describe('ControlCenterScreen', () => {
  beforeEach(() => {
    dispatch.mockReset();
    vi.mocked(useControlCenterController).mockReturnValue({ viewModel, dispatch });
  });

  it('composes the controller view model through the layout', () => {
    render(<ControlCenterScreen />);

    expect(screen.getByRole('heading', { name: 'Dhepil Suite' })).toBeInTheDocument();
    expect(screen.getByText('Project tidak ditemukan')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh status project' }));

    expect(dispatch).toHaveBeenCalledWith('project.refresh');
  });
});
