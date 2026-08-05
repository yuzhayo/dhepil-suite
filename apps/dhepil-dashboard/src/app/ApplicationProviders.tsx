import type { PropsWithChildren } from 'react';
import { SharedThemeProvider } from '../../../../ui/theme/SharedThemeProvider';

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <SharedThemeProvider colorPrimary="#1677ff" borderRadius={12}>
      {children}
    </SharedThemeProvider>
  );
}
