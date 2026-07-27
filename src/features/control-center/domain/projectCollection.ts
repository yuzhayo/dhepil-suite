import type { ProjectSummary } from '../types';
import { ACTIVE_STATUSES } from './projectStatus';

export type ProjectSortMode = 'name-asc' | 'name-desc' | 'port-asc' | 'active-first';
export type ProjectViewMode = 'grid' | 'list';

function compareNames(first: ProjectSummary, second: ProjectSummary) {
  return first.name.localeCompare(second.name, 'id', { sensitivity: 'base' });
}

function matchesSearch(project: ProjectSummary, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase('id');
  if (!normalizedQuery) {
    return true;
  }

  return [
    project.name,
    project.description,
    project.relativePath,
    project.port === undefined ? '' : String(project.port),
  ].some((value) => value.toLocaleLowerCase('id').includes(normalizedQuery));
}

export function selectProjects(
  projects: ProjectSummary[],
  query: string,
  sortMode: ProjectSortMode,
) {
  const selected = projects.filter((project) => matchesSearch(project, query));

  return selected.sort((first, second) => {
    switch (sortMode) {
      case 'name-desc':
        return compareNames(second, first);
      case 'port-asc':
        return (
          (first.port ?? Number.POSITIVE_INFINITY) - (second.port ?? Number.POSITIVE_INFINITY) ||
          compareNames(first, second)
        );
      case 'active-first': {
        const firstActive = ACTIVE_STATUSES.has(first.status) ? 0 : 1;
        const secondActive = ACTIVE_STATUSES.has(second.status) ? 0 : 1;
        return firstActive - secondActive || compareNames(first, second);
      }
      case 'name-asc':
        return compareNames(first, second);
    }
  });
}
