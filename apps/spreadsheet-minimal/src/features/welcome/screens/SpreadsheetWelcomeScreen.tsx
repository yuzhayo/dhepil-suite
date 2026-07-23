import { Card, Tag, Typography } from 'antd';

import './SpreadsheetWelcomeScreen.css';

const { Paragraph, Text, Title } = Typography;

export function SpreadsheetWelcomeScreen() {
  return (
    <main className="welcome-screen spreadsheet-welcome">
      <section className="welcome-content" aria-labelledby="spreadsheet-title">
        <Text className="welcome-eyebrow">SPREADSHEET MINIMAL · PORT 2001</Text>
        <Title id="spreadsheet-title">Spreadsheet workspace</Title>
        <Paragraph className="welcome-summary">
          App kosong yang siap menjadi editor spreadsheet tanpa mengambil kode dari artefak lama.
        </Paragraph>

        <Card className="welcome-card" title="Workspace terisolasi" variant="outlined">
          <Paragraph>
            Entry point dan dependency app ini hanya dimiliki folder spreadsheet-minimal.
            Implementasi editor berikutnya dapat dikerjakan tanpa menyentuh app Dhepil atau root.
          </Paragraph>
          <div className="welcome-tags" aria-label="Stack aplikasi">
            <Tag color="green" variant="filled">
              React 19
            </Tag>
            <Tag color="green" variant="filled">
              Ant Design 6
            </Tag>
            <Tag color="green" variant="filled">
              Vite 7
            </Tag>
          </div>
        </Card>
      </section>
    </main>
  );
}
