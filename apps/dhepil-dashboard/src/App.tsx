import { ApplicationProviders } from './app/ApplicationProviders';
import { DashboardGate } from './DashboardGate';

export default function App() {
  return (
    <ApplicationProviders>
      <DashboardGate />
    </ApplicationProviders>
  );
}
