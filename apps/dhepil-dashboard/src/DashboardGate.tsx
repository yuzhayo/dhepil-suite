import { CoreLayout } from '../../../ui/CoreLayout';
import { Header } from '../../../ui/header/Header';

export function DashboardGate() {
  const headerViewModel = {
    title: 'Dhepil Dashboard',
    subtitle: 'Multi-Provider API Monitor',
    actions: [],
  };

  return (
    <CoreLayout
      header={<Header viewModel={headerViewModel} />}
    />
  );
}
