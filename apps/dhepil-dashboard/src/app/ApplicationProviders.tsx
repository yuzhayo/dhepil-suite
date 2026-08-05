import type { PropsWithChildren } from 'react';
import { SharedThemeProvider } from '../../../../ui/theme/SharedThemeProvider';
import { dashboardTheme } from './theme';

export function ApplicationProviders({ children }: PropsWithChildren) {
  return (
    <SharedThemeProvider 
      colorPrimary={dashboardTheme.colorPrimary} 
      borderRadius={dashboardTheme.borderRadius}
    >
      {children}
    </SharedThemeProvider>
  );
}
