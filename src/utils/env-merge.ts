import type { Environment } from '../types';

export function mergeEnvironments(stored: Environment[], scanned: Environment[]): Environment[] {
  const byId = new Map<string, Environment>();

  for (const env of stored) {
    byId.set(env.id, env);
  }

  for (const env of scanned) {
    const existing = byId.get(env.id);
    byId.set(env.id, {
      ...existing,
      ...env,
      createdAt: existing?.createdAt ?? env.createdAt,
      updatedAt: env.updatedAt ?? existing?.updatedAt ?? env.updatedAt,
      dependencies:
        env.dependencies.length > 0
          ? env.dependencies
          : existing?.dependencies ?? [],
      tags: Array.from(new Set([...(existing?.tags ?? []), ...env.tags])),
    });
  }

  return Array.from(byId.values());
}
