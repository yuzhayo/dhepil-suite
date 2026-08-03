import { Alert, Button, Card, Tag } from 'antd';

import { createHostStatus } from './hostStatus';

export function HostStatusScreen() {
  const status = createHostStatus(window.location);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Dhepil Suite local module host</p>
          <h1>Tampermonyet</h1>
          <p className="page-description">
            App bersih untuk memindahkan module Tampermonkey secara bertahap.
          </p>
        </div>
        <Tag color="green">Host ready</Tag>
      </header>

      <Alert
        showIcon
        type="success"
        title="Scanner Dashboard, Token, dan Usage Log tersedia"
        description="Satu userscript membaca Current balance, real API key, dan hanya row Usage Log bertipe System, lalu menulis JSON per-user ke database lokal."
      />

      <section className="status-grid" aria-label="Tampermonyet host status">
        <Card title="HTTP host" extra={<Tag color="green">Online</Tag>}>
          <dl className="status-list">
            <div>
              <dt>Origin</dt>
              <dd>
                <code>{status.origin}</code>
              </dd>
            </div>
            <div>
              <dt>Stable port</dt>
              <dd>{status.port}</dd>
            </div>
            <div>
              <dt>Require root</dt>
              <dd>
                <code>{status.requireRootUrl}</code>
              </dd>
            </div>
          </dl>
          <div className="status-actions">
            <Button type="primary" href={status.agentRouterUserscriptUrl} target="_blank">
              Open AgentRouter userscript
            </Button>
            <Button href={status.healthUrl} target="_blank">
              Open health endpoint
            </Button>
          </div>
        </Card>

        <Card title="Migration state" extra={<Tag color="blue">{status.moduleCount} scanner</Tag>}>
          <p className="migration-copy">
            Ketiga scanner memakai shared DOM, polling, storage rewrite-log, dan Shadow DOM UI.
            Token membuka key saat scan lalu mengembalikannya ke masked. Usage Log hanya menyimpan
            Time, Type System, dan Details asli tanpa terjemahan.
          </p>
        </Card>
      </section>
    </main>
  );
}
