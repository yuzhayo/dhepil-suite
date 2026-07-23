import { Card, Tag, Typography } from 'antd';

import './DhepilWelcomeScreen.css';

const { Paragraph, Text, Title } = Typography;

export function DhepilWelcomeScreen() {
  return (
    <main className="welcome-screen dhepil-welcome">
      <section className="welcome-content" aria-labelledby="dhepil-title">
        <Text className="welcome-eyebrow">DHEPIL · PORT 2000</Text>
        <Title id="dhepil-title">Dhepil siap dikembangkan</Title>
        <Paragraph className="welcome-summary">
          Ini adalah app baru yang berdiri sendiri di dalam monorepo Dhepil Suite.
        </Paragraph>

        <Card className="welcome-card" title="Workspace baru" variant="outlined">
          <Paragraph>
            Screen minimal ini membuktikan entry point, provider Ant Design, dan dev server milik
            Dhepil sudah berjalan secara independen.
          </Paragraph>
          <div className="welcome-tags" aria-label="Stack aplikasi">
            <Tag color="blue" variant="filled">
              React 19
            </Tag>
            <Tag color="blue" variant="filled">
              Ant Design 6
            </Tag>
            <Tag color="blue" variant="filled">
              Vite 7
            </Tag>
          </div>
        </Card>
      </section>
    </main>
  );
}
