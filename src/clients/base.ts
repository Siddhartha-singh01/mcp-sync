import type { CanonicalConfig } from '../types.js';

export interface ClientAdapter {
  id: string;
  name: string;

  /** Detects if this client is installed on the user's system */
  detect(): Promise<boolean>;

  /** Reads the client's current configuration from disk */
  readConfig(): Promise<unknown>;

  /** Writes the updated configuration to disk */
  writeConfig(config: unknown): Promise<void>;

  /** Converts the client's internal schema into our canonical format */
  schemaToCanonical(config: unknown): CanonicalConfig;

  /** Merges our canonical format into the client's internal schema */
  canonicalToSchema(
    canonical: CanonicalConfig,
    currentSchema: unknown,
  ): unknown;
}
