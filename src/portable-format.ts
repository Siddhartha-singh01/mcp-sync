import fs from 'node:fs/promises';
import yaml from 'yaml';
import { type CanonicalConfig, CanonicalConfigSchema } from './types.js';

export async function readCanonicalConfig(
  path: string,
): Promise<CanonicalConfig> {
  try {
    const content = await fs.readFile(path, 'utf8');
    const parsed = yaml.parse(content);
    return CanonicalConfigSchema.parse(parsed || { mcpServers: {} });
  } catch (error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return { mcpServers: {} };
    }
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read config at ${path}: ${msg}`);
  }
}

export async function writeCanonicalConfig(
  path: string,
  config: CanonicalConfig,
): Promise<void> {
  const content = yaml.stringify(config);
  await fs.writeFile(path, content, 'utf8');
}
