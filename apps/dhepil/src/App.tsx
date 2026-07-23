import { ApplicationProviders } from './app/ApplicationProviders';
import { DhepilWelcomeScreen } from './features/welcome/screens/DhepilWelcomeScreen';

export default function App() {
  return (
    <ApplicationProviders>
      <DhepilWelcomeScreen />
    </ApplicationProviders>
  );
}
