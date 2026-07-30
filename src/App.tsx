import { App as AntdApp, ConfigProvider } from 'antd';

import { ControlCenterScreen } from './ControlCenterScreen';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 10,
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        },
      }}
    >
      <AntdApp>
        <ControlCenterScreen />
      </AntdApp>
    </ConfigProvider>
  );
}
