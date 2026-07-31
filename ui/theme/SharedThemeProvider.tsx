import type { PropsWithChildren } from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import { useSharedTheme } from './useSharedTheme';

export function SharedThemeProvider({
  children,
  colorPrimary,
  borderRadius = 10,
}: PropsWithChildren<{ colorPrimary: string; borderRadius?: number }>) {
  const { mode } = useSharedTheme();

  return (
    <ConfigProvider
      theme={{
        cssVar: { key: 'app' },
        hashed: false,
        algorithm: mode === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary,
          borderRadius,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
