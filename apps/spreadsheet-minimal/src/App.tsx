import { ApplicationProviders } from './app/ApplicationProviders';
import { SpreadsheetWelcomeScreen } from './features/welcome/screens/SpreadsheetWelcomeScreen';

export default function App() {
  return (
    <ApplicationProviders>
      <SpreadsheetWelcomeScreen />
    </ApplicationProviders>
  );
}
