import { useState } from 'react';
import { Layout, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { ThemeToggle } from '../../../ui/theme/ThemeToggle';
import { Sidebar } from '../../../ui/sidebar/Sidebar';
import { HomeOutlined, ApiOutlined, SettingOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProvidersScreen } from './screens/ProvidersScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const { Header, Content } = Layout;

export function DashboardGate() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('/');

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/providers',
      icon: <ApiOutlined />,
      label: 'Providers',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  const handleBreakpoint = (isMobile: boolean) => {
    setMobile(isMobile);
    if (isMobile) setCollapsed(true);
  };

  const handleNavigate = (path: string) => {
    setCurrentScreen(path);
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case '/':
        return <DashboardScreen />;
      case '/providers':
        return <ProvidersScreen />;
      case '/settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div className="dashboard-shell">
      <Layout className="dashboard-layout">
        <Header className="dashboard-header">
          <div className="dashboard-header__left">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
            <span className="dashboard-header__title">DHEPIL DASHBOARD</span>
          </div>
          <ThemeToggle />
        </Header>

        <Layout hasSider className="dashboard-body">
          <Sidebar
            collapsed={collapsed}
            mobile={mobile}
            items={menuItems}
            navigationLabel="Main Navigation"
            selectedKey={currentScreen}
            onBreakpoint={handleBreakpoint}
            onCollapse={setCollapsed}
            onNavigate={handleNavigate}
          />
          <Content className="dashboard-content">
            {renderScreen()}
          </Content>
        </Layout>
      </Layout>
    </div>
  );
}
