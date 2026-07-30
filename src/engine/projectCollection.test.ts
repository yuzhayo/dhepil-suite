import { describe, expect, it } from 'vitest';
import {
  isProjectSortMode,
  isProjectViewMode,
  selectProjects,
} from './projectCollection';
import type { ProjectSummary } from './contracts';

describe('projectCollection', () => {
  const p1: ProjectSummary = {
    id: 'b-app',
    name: 'B App',
    description: 'Second app',
    relativePath: 'apps/b-app',
    port: 2002,
    status: 'stopped',
    managed: false,
    logs: [],
    desktop: { enabled: false, script: '' },
  };

  const p2: ProjectSummary = {
    id: 'a-app',
    name: 'A App',
    description: 'First app',
    relativePath: 'apps/a-app',
    port: 2001,
    status: 'running',
    managed: true,
    logs: [],
    desktop: { enabled: false, script: '' },
  };

  const projects = [p1, p2];

  it('validates sort and view modes', () => {
    expect(isProjectSortMode('name-asc')).toBe(true);
    expect(isProjectSortMode('invalid')).toBe(false);
    expect(isProjectViewMode('grid')).toBe(true);
    expect(isProjectViewMode('table')).toBe(false);
  });

  it('sorts projects by name-asc', () => {
    const result = selectProjects(projects, '', 'name-asc');
    expect(result.map((p) => p.name)).toEqual(['A App', 'B App']);
  });

  it('sorts projects by name-desc', () => {
    const result = selectProjects(projects, '', 'name-desc');
    expect(result.map((p) => p.name)).toEqual(['B App', 'A App']);
  });

  it('sorts projects by port-asc', () => {
    const result = selectProjects(projects, '', 'port-asc');
    expect(result.map((p) => p.name)).toEqual(['A App', 'B App']);
  });

  it('sorts projects by active-first', () => {
    const result = selectProjects(projects, '', 'active-first');
    expect(result[0].name).toBe('A App'); // running
  });

  it('filters projects by search query', () => {
    const result = selectProjects(projects, 'Second', 'name-asc');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('B App');
  });
});
