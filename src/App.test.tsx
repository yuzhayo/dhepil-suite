import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import App from './App';
import type { ProjectStatus } from './engine';

const projectsResponse = {
  projects: [
    {
      id: 'dhepil',
      name: 'Dhepil',
      description: 'Aplikasi utama Dhepil.',
      relativePath: 'apps/dhepil',
      status: 'invalid',
      managed: false,
      logs: [],
      error: 'app.manifest.json tidak ditemukan.',
      desktop: {
        enabled: false,
        script: 'desktop:dev',
      },
    },
    {
      id: 'spreadsheet-minimal',
      name: 'Spreadsheet Minimal',
      description: 'Editor spreadsheet minimal.',
      relativePath: 'apps/spreadsheet-minimal',
      port: 2001,
      url: 'http://127.0.0.1:2001',
      status: 'running',
      managed: true,
      pid: 4321,
      logs: [],
      desktop: {
        enabled: false,
        script: 'desktop:dev',
      },
    },
  ],
};

function responseFor(projects: unknown[]) {
  return { ok: true, json: async () => ({ projects }) };
}

function project(id: string, status: ProjectStatus, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id,
    description: `${id} description`,
    relativePath: `apps/${id}`,
    port: 2000,
    url: 'http://127.0.0.1:2000',
    status,
    managed: false,
    logs: [],
    desktop: { enabled: false, script: 'desktop:dev' },
    ...overrides,
  };
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => projectsResponse,
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('menampilkan setiap project dan status kontraknya', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Dhepil Suite' })).toBeInTheDocument();
    expect(
      await screen.findByRole('article', { name: 'Project Spreadsheet Minimal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Konfigurasi tidak valid')).toBeInTheDocument();
    expect(
      within(screen.getByRole('article', { name: 'Project Dhepil' })).getByRole('button', {
        name: 'Stop server',
      }),
    ).toBeDisabled();
    expect(
      within(screen.getByRole('article', { name: 'Project Spreadsheet Minimal' })).getByRole(
        'button',
        { name: 'Stop server' },
      ),
    ).toBeEnabled();
  });

  it('memfilter project dan mengganti mode tampilan', async () => {
    render(<App />);

    await screen.findByRole('article', { name: 'Project Spreadsheet Minimal' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Cari project' }), {
      target: { value: '2001' },
    });

    expect(screen.queryByRole('article', { name: 'Project Dhepil' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: 'Project Spreadsheet Minimal' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('List'));
    expect(screen.getByLabelText('Daftar project mode list')).toBeInTheDocument();
  });

  it('menghentikan server managed dari dropdown quick kill', async () => {
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Server aktif (1) ▾' }));
    fireEvent.click(await screen.findByText('Kill'));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/projects/spreadsheet-minimal/stop',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('mengunci seluruh status lifecycle dan action state yang terlihat pengguna', async () => {
    const projects = [
      project('stopped-app', 'stopped'),
      project('starting-app', 'starting'),
      project('running-app', 'running', { managed: true, pid: 10 }),
      project('stopping-app', 'stopping', { managed: true, pid: 11 }),
      project('error-app', 'error', { error: 'Spawn gagal.' }),
      project('invalid-app', 'invalid', { error: 'Manifest rusak.' }),
      project('external-app', 'external'),
      project('conflict-app', 'port-conflict'),
      project('missing-app', 'not-found', { managed: true, pid: 12 }),
    ];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(responseFor(projects)));

    render(<App />);
    for (const label of [
      'Tidak aktif',
      'Sedang dinyalakan',
      'Aktif',
      'Sedang dihentikan',
      'Terjadi error',
      'Konfigurasi tidak valid',
      'Aktif di luar dashboard',
      'Port bentrok',
      'App not found (404)',
    ]) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0);
    }

    expect(
      within(screen.getByRole('article', { name: 'Project stopped-app' })).getByRole('button', {
        name: 'Start & buka',
      }),
    ).toBeEnabled();
    expect(
      within(screen.getByRole('article', { name: 'Project conflict-app' })).getByRole('button', {
        name: 'Tidak tersedia',
      }),
    ).toBeDisabled();
    expect(
      within(screen.getByRole('article', { name: 'Project external-app' })).getByRole('button', {
        name: 'Stop server',
      }),
    ).toBeDisabled();
    expect(
      within(screen.getByRole('article', { name: 'Project missing-app' })).getByRole('button', {
        name: 'Stop server',
      }),
    ).toBeEnabled();
  });

  it('menampilkan loading dan empty state yang dapat diakses', async () => {
    let resolveRequest!: (value: unknown) => void;
    const pendingRequest = new Promise((resolvePromise) => {
      resolveRequest = resolvePromise;
    });
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingRequest));

    render(<App />);
    expect(screen.getByLabelText('Memuat project')).toBeInTheDocument();

    resolveRequest(responseFor([]));
    expect(await screen.findByText('Project tidak ditemukan')).toBeInTheDocument();
  });

  it('menampilkan page error dan action Coba lagi', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API offline.')));

    render(<App />);
    expect(await screen.findByText('Control center mengalami masalah')).toBeInTheDocument();
    expect(screen.getByText('API offline.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });

  it('mengurutkan project dan mempertahankan mode grid/list', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(responseFor([project('Zeta', 'stopped'), project('Alpha', 'stopped')])),
    );

    render(<App />);
    await screen.findByRole('article', { name: 'Project Alpha' });
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Urutkan project' }));
    fireEvent.click(await screen.findByText('Nama Z–A'));
    expect(screen.getByLabelText('Daftar project mode grid').firstElementChild).toHaveAttribute(
      'aria-label',
      'Project Zeta',
    );

    fireEvent.click(screen.getByText('List'));
    expect(screen.getByLabelText('Daftar project mode list')).toBeInTheDocument();
  });

  it('mempertahankan tombol kill untuk managed process yang foldernya hilang', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          projects: [
            {
              id: 'deleted-app',
              name: 'Deleted App',
              description: '',
              relativePath: 'apps/deleted-app',
              port: 2002,
              url: 'http://127.0.0.1:2002',
              status: 'not-found',
              managed: true,
              pid: 9876,
              logs: [],
              error: 'Folder app tidak ditemukan.',
              desktop: {
                enabled: false,
                script: 'desktop:dev',
              },
            },
          ],
        }),
      }),
    );

    render(<App />);

    const card = await screen.findByRole('article', { name: 'Project Deleted App' });
    expect(within(card).getAllByText('App not found (404)')).toHaveLength(2);
    expect(within(card).getByRole('button', { name: 'Stop server' })).toBeEnabled();
    expect(within(card).getByRole('button', { name: 'Tidak tersedia' })).toBeDisabled();
  });
});
