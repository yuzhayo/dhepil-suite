export interface HostStatus {
  origin: string;
  port: string;
  healthUrl: string;
  requireRootUrl: string;
  moduleCount: number;
}

export function createHostStatus(location: Pick<Location, 'origin' | 'port'>): HostStatus {
  return {
    origin: location.origin,
    port: location.port || 'default',
    healthUrl: new URL('/health.json', location.origin).toString(),
    requireRootUrl: new URL('/require/', location.origin).toString(),
    moduleCount: 0,
  };
}
