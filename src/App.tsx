import { SharedThemeProvider } from '../ui/theme/SharedThemeProvider';
import { ControlCenterScreen } from './ControlCenterScreen';

export default function App() {
  return (
    <SharedThemeProvider colorPrimary="#1677ff">
      <ControlCenterScreen />
    </SharedThemeProvider>
  );
}
