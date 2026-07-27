import { selectProjects } from './projectCollection';
import type { ProjectSummary } from '../types';

function project(
  id: string,
  name: string,
  port: number,
  status: ProjectSummary['status'],
): ProjectSummary {
  return {
    id,
    name,
    description: `${name} description`,
    relativePath: `apps/${id}`,
    port,
    url: `http://127.0.0.1:${port}`,
    status,
    managed: false,
    logs: [],
    desktop: {
      enabled: false,
      script: 'desktop:dev',
    },
  };
}

const projects = [
  project('zeta', 'Zeta', 2002, 'stopped'),
  project('alpha', 'Alpha', 2000, 'running'),
  project('beta', 'Beta', 2001, 'external'),
];

describe('selectProjects', () => {
  it('mencari berdasarkan nama, path, deskripsi, atau port', () => {
    expect(selectProjects(projects, '2001', 'name-asc').map(({ id }) => id)).toEqual(['beta']);
    expect(selectProjects(projects, 'apps/zeta', 'name-asc').map(({ id }) => id)).toEqual(['zeta']);
  });

  it('mengurutkan app aktif lebih dahulu tanpa mengubah input', () => {
    expect(selectProjects(projects, '', 'active-first').map(({ id }) => id)).toEqual([
      'alpha',
      'beta',
      'zeta',
    ]);
    expect(projects.map(({ id }) => id)).toEqual(['zeta', 'alpha', 'beta']);
  });

  it('mencari deskripsi dan mengurutkan port undefined secara deterministik', () => {
    const withoutPort = { ...projects[0], id: 'no-port', name: 'No Port', port: undefined };
    const withDescription = { ...projects[1], description: 'needle description' };

    expect(selectProjects([withoutPort, withDescription], 'needle', 'name-asc')).toEqual([
      withDescription,
    ]);
    expect(selectProjects([withoutPort, projects[2]], '', 'port-asc').map(({ id }) => id)).toEqual([
      'beta',
      'no-port',
    ]);
  });

  it('mencari berdasarkan id dan tidak mengubah input pada setiap mode sort', () => {
    const input = [...projects];
    expect(selectProjects(input, 'zeta', 'name-desc').map(({ id }) => id)).toEqual(['zeta']);
    expect(selectProjects(input, 'apps/', 'port-asc').map(({ id }) => id)).toEqual([
      'alpha',
      'beta',
      'zeta',
    ]);
    expect(input).toEqual(projects);
  });

  it('mempertahankan klasifikasi active-first untuk seluruh 9 status', () => {
    const statuses: ProjectSummary['status'][] = [
      'stopped',
      'starting',
      'running',
      'stopping',
      'error',
      'invalid',
      'external',
      'port-conflict',
      'not-found',
    ];
    const input = statuses.map((status, index) =>
      project(status, `Project ${index}`, 2100 + index, status),
    );

    expect(selectProjects(input, '', 'active-first').map(({ status }) => status)).toEqual([
      'starting',
      'running',
      'stopping',
      'external',
      'not-found',
      'stopped',
      'error',
      'invalid',
      'port-conflict',
    ]);
    expect(input.map(({ status }) => status)).toEqual(statuses);
  });
});
