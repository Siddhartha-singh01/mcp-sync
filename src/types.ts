import { z } from 'zod';

export const McpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  enabledFor: z.array(z.string()).default(['all']),
});

export type McpServerConfig = z.infer<typeof McpServerConfigSchema>;

export const CanonicalConfigSchema = z.object({
  mcpServers: z.record(McpServerConfigSchema),
});

export type CanonicalConfig = z.infer<typeof CanonicalConfigSchema>;
