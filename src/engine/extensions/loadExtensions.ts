import type { ControlCenterExtension } from './contracts';

export type ExtensionModuleMap = Readonly<Record<string, ControlCenterExtension>>;

const discoveredModules = import.meta.glob<ControlCenterExtension>('./modules/*/index.ts', {
  eager: true,
  import: 'default',
});

export function loadExtensions(
  imports: ExtensionModuleMap = discoveredModules,
): ControlCenterExtension[] {
  return Object.entries(imports)
    .sort(([firstPath], [secondPath]) => firstPath.localeCompare(secondPath))
    .map(([, extension]) => extension);
}
