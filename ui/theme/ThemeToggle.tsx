import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { Switch } from 'antd';

import { useSharedTheme } from './useSharedTheme';

export function ThemeToggle() {
  const { mode, setTheme } = useSharedTheme();
  const nextMode = mode === 'dark' ? 'light' : 'dark';

  return (
    <Switch
      checked={mode === 'dark'}
      onChange={() => setTheme(nextMode)}
      checkedChildren={<MoonOutlined />}
      unCheckedChildren={<SunOutlined />}
      aria-label={nextMode === 'dark' ? 'Gunakan tema gelap' : 'Gunakan tema terang'}
    />
  );
}
