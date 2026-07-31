import type { PropsWithChildren } from 'react';
import { SharedThemeProvider } from '../../../../ui/theme/SharedThemeProvider';

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <SharedThemeProvider colorPrimary="#16a36f" borderRadius={12}>
      {children}
    </SharedThemeProvider>
  );
}
