import { ApplicationProviders } from './app/ApplicationProviders';
import { ClipboardGate } from './ClipboardGate';

export default function App() {
  return (
    <ApplicationProviders>
      <ClipboardGate />
    </ApplicationProviders>
  );
}
