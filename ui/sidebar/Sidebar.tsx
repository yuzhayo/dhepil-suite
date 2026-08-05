import { Layout, Menu } from 'antd';
import type { MenuProps } from 'antd';
import './Sidebar.css';

const { Sider } = Layout;

export interface SidebarProps {
  readonly collapsed: boolean;
  readonly mobile: boolean;
  readonly items: MenuProps['items'];
  readonly navigationLabel: string;
  readonly selectedKey: string;
  readonly onBreakpoint: (mobile: boolean) => void;
  readonly onCollapse: (collapsed: boolean) => void;
  readonly onNavigate: (path: string) => void;
}

export function Sidebar({
  collapsed,
  mobile,
  items,
  navigationLabel,
  selectedKey,
  onBreakpoint,
  onCollapse,
  onNavigate,
}: SidebarProps) {
  const hiddenOnMobile = mobile && collapsed;

  return (
    <Sider
      breakpoint="lg"
      className="core-ui-sidebar"
      collapsed={collapsed}
      collapsedWidth={mobile ? 0 : 72}
      collapsible
      onBreakpoint={onBreakpoint}
      onCollapse={onCollapse}
      theme="dark"
      trigger={null}
      width="clamp(15rem, 19vw, 18rem)"
    >
      {hiddenOnMobile ? null : (
        <nav aria-label={navigationLabel} className="core-ui-sidebar__navigation">
          <Menu
            items={items}
            mode="inline"
            onClick={({ key }) => onNavigate(key)}
            selectedKeys={[selectedKey]}
            theme="dark"
          />
        </nav>
      )}
    </Sider>
  );
}
