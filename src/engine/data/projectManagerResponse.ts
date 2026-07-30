import type { ProjectStatus, ProjectSummary } from '../contracts';

export type ProjectManagerAction = 'list' | 'start' | 'stop';
export type ProjectManagerRequestErrorKind =
  'network' | 'http' | 'invalid-json' | 'malformed-response' | 'cancelled';

export class ProjectManagerRequestError extends Error {
  constructor(
    public readonly status: number | undefined,
    public readonly action: ProjectManagerAction,
    public readonly kind: ProjectManagerRequestErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'ProjectManagerRequestError';
  }
}

export function parseProjectsResponse(raw: unknown): ProjectSummary[] {
  const response = objectRecord(raw, 'Response is not an object.');
  const projects = response.projects;

  if (!Array.isArray(projects)) {
    throw new Error('Response missing projects array.');
  }

  return projects.map((project, index) => parseProjectSummary(project, index));
}

export function parseActionResponse(raw: unknown): { error?: string } {
  const response = objectRecord(raw, 'Response is not an object.');
  const { error } = response;

  if (error !== undefined && typeof error !== 'string') {
    throw new Error('Response error field is not a string.');
  }

  return error === undefined ? {} : { error };
}

function parseProjectSummary(raw: unknown, index: number): ProjectSummary {
  const project = objectRecord(raw, `Item ${index} is not an object.`);
  const status = project.status;

  if (!isProjectStatus(status)) {
    throw new Error(`Item ${index} has invalid status.`);
  }

  return {
    id: stringField(project, 'id', index),
    name: stringField(project, 'name', index),
    description: stringField(project, 'description', index),
    relativePath: stringField(project, 'relativePath', index),
    ...optionalNumberField(project, 'port', index),
    ...optionalStringField(project, 'url', index),
    status,
    managed: booleanField(project, 'managed', index),
    ...optionalNumberField(project, 'pid', index),
    logs: stringArrayField(project, 'logs', index),
    ...optionalStringField(project, 'error', index),
    desktop: desktopField(project, index),
  };
}

function objectRecord(raw: unknown, errorMessage: string): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(errorMessage);
  }

  return raw as Record<string, unknown>;
}

function stringField(project: Record<string, unknown>, field: string, index: number): string {
  const value = project[field];
  if (typeof value !== 'string') {
    throw new Error(`Item ${index} missing string ${field}.`);
  }
  return value;
}

function booleanField(project: Record<string, unknown>, field: string, index: number): boolean {
  const value = project[field];
  if (typeof value !== 'boolean') {
    throw new Error(`Item ${index} missing boolean ${field}.`);
  }
  return value;
}

function stringArrayField(
  project: Record<string, unknown>,
  field: string,
  index: number,
): string[] {
  const value = project[field];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Item ${index} missing string array ${field}.`);
  }
  return value;
}

function optionalStringField(
  project: Record<string, unknown>,
  field: string,
  index: number,
): { [key: string]: string } {
  const value = project[field];
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'string') {
    throw new Error(`Item ${index} ${field} is not string.`);
  }
  return { [field]: value };
}

function optionalNumberField(
  project: Record<string, unknown>,
  field: string,
  index: number,
): { [key: string]: number } {
  const value = project[field];
  if (value === undefined) {
    return {};
  }
  if (typeof value !== 'number') {
    throw new Error(`Item ${index} ${field} is not number.`);
  }
  return { [field]: value };
}

function desktopField(project: Record<string, unknown>, index: number): ProjectSummary['desktop'] {
  const desktop = objectRecord(project.desktop, `Item ${index} desktop is not an object.`);
  const { enabled, script } = desktop;

  if (typeof enabled !== 'boolean') {
    throw new Error(`Item ${index} desktop.enabled is not boolean.`);
  }
  if (typeof script !== 'string') {
    throw new Error(`Item ${index} desktop.script is not string.`);
  }

  return { enabled, script };
}

function isProjectStatus(value: unknown): value is ProjectStatus {
  return (
    value === 'stopped' ||
    value === 'starting' ||
    value === 'running' ||
    value === 'stopping' ||
    value === 'error' ||
    value === 'invalid' ||
    value === 'external' ||
    value === 'port-conflict' ||
    value === 'not-found'
  );
}
