/**
 * shared/ui/GatePanel.tsx
 * ========================
 * Panel generic yang merender satu GateState dengan layout AntD yang lebih baik.
 * Tidak tahu provider apa pun - provider hanya lewat sebagai label dan judul.
 */

import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  ReloadOutlined,
  DollarOutlined,
  ThunderboltOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type { GateErrorCode, GateState } from './gate';

const { Text, Title } = Typography;

/** Saran tindakan per kode error - tabel yang sama dengan GATE_CONTRACT.md. */
const ERROR_HINTS: Record<GateErrorCode, string> = {
  auth_invalid: 'Sesi kedaluwarsa. Jalankan refresh sesi, atau login manual ulang.',
  network_error: 'Tidak bisa menghubungi provider. Cek koneksi internet.',
  response_shape_changed:
    'Struktur response provider berubah. Mapping di logic provider perlu disesuaikan.',
  config_invalid: 'Config atau user data provider tidak lengkap. Cek file config-nya.',
  unknown: 'Kegagalan tak terduga. Cek log logic untuk detailnya.',
};

function formatUsd(value: number) {
  return value.toFixed(2);
}

function formatTime(date: Date) {
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

interface GatePanelProps {
  title: string;
  state: GateState;
  onRefresh: () => void;
}

export function GatePanel({ title, state, onRefresh }: GatePanelProps) {
  const refreshButton = (
    <Button
      type="text"
      icon={<ReloadOutlined />}
      onClick={onRefresh}
      loading={state.kind === 'loading'}
    >
      Refresh
    </Button>
  );

  return (
    <Card
      title={
        <Space>
          <ApiOutlined style={{ fontSize: 20 }} />
          <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        </Space>
      }
      extra={refreshButton}
      style={{ height: '100%' }}
      styles={{
        body: { minHeight: 280 },
      }}
    >
      {renderBody(state)}
    </Card>
  );
}

function renderBody(state: GateState) {
  switch (state.kind) {
    case 'loading':
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 240,
          }}
        >
          <Spin size="large" />
          <Text type="secondary" style={{ marginTop: 16 }}>
            Membaca gate file...
          </Text>
        </div>
      );

    case 'missing':
      return (
        <Alert
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          message="Belum ada data"
          description={
            <Space direction="vertical" size={4}>
              <Text>Gate file belum pernah ditulis.</Text>
              <Text type="secondary">
                Jalankan logic provider ini dulu, lalu klik Refresh untuk melihat hasilnya.
              </Text>
            </Space>
          }
        />
      );

    case 'invalid':
      return (
        <Alert
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          message="Gate file tidak valid"
          description={
            <Space direction="vertical" size={8}>
              <Text>{state.reason}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                ⚠️ Angka sengaja tidak ditampilkan karena datanya tidak bisa dipercaya.
              </Text>
            </Space>
          }
        />
      );

    case 'error':
      return (
        <Alert
          type="error"
          showIcon
          icon={<CloseCircleOutlined />}
          message={<strong>Pengambilan data gagal</strong>}
          description={
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <Text>{state.message}</Text>
              <div
                style={{
                  padding: 12,
                  background: 'rgba(255, 77, 79, 0.05)',
                  borderRadius: 6,
                  borderLeft: '3px solid #ff4d4f',
                }}
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💡 {ERROR_HINTS[state.code]}
                </Text>
              </div>
              {state.lastUpdated ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ClockCircleOutlined /> Percobaan terakhir: {formatTime(state.lastUpdated)}
                </Text>
              ) : null}
            </Space>
          }
        />
      );

    case 'ok':
      return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {state.isStale ? (
            <Alert
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              message="Data sudah lama"
              description="Terakhir diperbarui lebih dari 25 jam lalu. Jadwal refresh kemungkinan tidak berjalan."
              style={{ marginBottom: 8 }}
            />
          ) : null}

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      <DollarOutlined /> Saldo
                    </span>
                  }
                  value={formatUsd(state.numbers.balance)}
                  prefix="$"
                  valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 600 }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  border: 'none',
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      <ThunderboltOutlined /> Konsumsi
                    </span>
                  }
                  value={formatUsd(state.numbers.consumption)}
                  prefix="$"
                  valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 600 }}
                />
              </Card>
            </Col>

            <Col xs={24} sm={8}>
              <Card
                style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  border: 'none',
                }}
              >
                <Statistic
                  title={
                    <span style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
                      <ApiOutlined /> Request
                    </span>
                  }
                  value={state.numbers.requests}
                  valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 600 }}
                />
              </Card>
            </Col>
          </Row>

          <Descriptions
            size="small"
            column={1}
            bordered
            style={{
              background: 'var(--color-bg-container)',
            }}
          >
            <Descriptions.Item
              label={
                <Space>
                  <CheckCircleOutlined />
                  <span>Status</span>
                </Space>
              }
            >
              <Tag
                color={state.isStale ? 'warning' : 'success'}
                icon={state.isStale ? <WarningOutlined /> : <CheckCircleOutlined />}
              >
                {state.isStale ? 'Stale' : 'Segar'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item
              label={
                <Space>
                  <ClockCircleOutlined />
                  <span>Terakhir Update</span>
                </Space>
              }
            >
              <Text>{formatTime(state.lastUpdated)}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Space>
      );
  }
}
