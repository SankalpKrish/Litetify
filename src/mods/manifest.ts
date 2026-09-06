import { z } from 'zod';

export const ModType = z.enum(['theme', 'extension', 'app']);
export type ModType = z.infer<typeof ModType>;

export const ManifestSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().min(1).max(32),
  type: ModType,
  entry: z.string().min(1).max(512),
  description: z.string().max(1024).optional(),
  author: z.string().max(128).optional(),
  litetifyApiVersion: z.string().min(1).max(16),
  permissions: z.array(z.string().max(64)).max(32).optional(),
  icon: z.string().max(64).optional(),
});

export type ModManifest = z.infer<typeof ManifestSchema>;

export interface ModEntry {
  path: string;
  manifest: ModManifest;
  enabled: boolean;
  error?: string;
}

export function validateManifest(
  data: unknown,
): { ok: true; manifest: ModManifest } | { ok: false; error: string } {
  const result = ManifestSchema.safeParse(data);
  if (result.success) {
    return { ok: true, manifest: result.data };
  }
  return {
    ok: false,
    error: result.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join('; '),
  };
}

export function manifestFileName(): string {
  return 'manifest.json';
}
