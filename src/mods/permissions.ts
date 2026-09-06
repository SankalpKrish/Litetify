/** Shared permission-tree filtering for mods. */
export function filterApiByPermissions<T extends Record<string, unknown>>(
  api: T,
  permissions: string[],
): T {
  if (!permissions.length) return {} as T;
  function matches(path: string): boolean {
    return permissions.some(
      (p) =>
        p === path ||
        path.startsWith(p + '.') ||
        (p.endsWith(':*') && path.startsWith(p.slice(0, -2))),
    );
  }
  function walk(
    obj: Record<string, unknown>,
    prefix: string,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'function') {
        if (matches(path)) result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        const nested = walk(value as Record<string, unknown>, path);
        if (Object.keys(nested).length) result[key] = nested;
      }
    }
    return result;
  }
  return walk(api as Record<string, unknown>, '') as T;
}
