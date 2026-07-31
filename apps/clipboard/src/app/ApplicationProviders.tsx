import type { PropsWithChildren } from 'react';
import { SharedThemeProvider } from '../../../../ui/theme/SharedThemeProvider';

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <SharedThemeProvider colorPrimary="#722ed1" borderRadius={12}>
      {children}
    </SharedThemeProvider>
  );
}
