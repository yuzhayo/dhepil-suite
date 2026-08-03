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
        type="info"
        title="Belum ada scanner yang disalin"
        description="Folder Tampermonkey lama tetap tidak disentuh. Module akan ditambahkan satu per satu ke public/require/."
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
          <Button type="primary" href={status.healthUrl} target="_blank">
            Open health endpoint
          </Button>
        </Card>

        <Card title="Migration state" extra={<Tag>{status.moduleCount} modules</Tag>}>
          <p className="migration-copy">
            Scaffold dan static host sudah siap. Scanner Dashboard, Token, dan Usage Log belum masuk
            ke app ini.
          </p>
        </Card>
      </section>
    </main>
  );
}
