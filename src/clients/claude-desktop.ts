import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { CanonicalConfig } from '../types.js';
import type { ClientAdapter } from './base.js';

function getClaudeDesktopConfigPath() {
  const platform = os.platform();
  if (platform === 'win32') {
    return path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      'Claude',
      'claude_desktop_config.json',
    );
  }
  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    );
  }
  return null;
}

export const claudeDesktopAdapter: ClientAdapter = {
  id: 'claude-desktop',
  name: 'Claude Desktop',

  async detect() {
    const configPath = getClaudeDesktopConfigPath();
    if (!configPath) return false;
    try {
      await fs.access(configPath);
      return true;
    } catch {
      return false;
    }
  },

  async readConfig() {
    const configPath = getClaudeDesktopConfigPath();
    if (!configPath) return {};
    try {
      const content = await fs.readFile(configPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return { mcpServers: {} };
    }
  },

  async writeConfig(config: unknown) {
    const configPath = getClaudeDesktopConfigPath();
    if (!configPath) return;

    const dir = path.dirname(configPath);
    await fs.mkdir(dir, { recursive: true });

    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
  },

  schemaToCanonical(config: unknown) {
    const canonical: CanonicalConfig = { mcpServers: {} };
    if (!config || typeof config !== 'object') return canonical;

    const mcpServers = (config as Record<string, any>).mcpServers;
    if (mcpServers && typeof mcpServers === 'object') {
      for (const [name, srv] of Object.entries(mcpServers)) {
        const s = srv as any;
        canonical.mcpServers[name] = {
          command: s.command || '',
          args: s.args,
          env: s.env,
          enabledFor: ['claude-desktop'],
        };
      }
    }
    return canonical;
  },

  canonicalToSchema(canonical: CanonicalConfig, currentSchema: unknown) {
    const newSchema: Record<string, any> =
      typeof currentSchema === 'object' && currentSchema !== null
        ? { ...currentSchema }
        : {};

    if (!newSchema.mcpServers) {
      newSchema.mcpServers = {};
    }

    for (const [name, srv] of Object.entries(canonical.mcpServers)) {
      if (
        !srv.enabledFor ||
        srv.enabledFor.includes('all') ||
        srv.enabledFor.includes('claude-desktop')
      ) {
        newSchema.mcpServers[name] = {
          command: srv.command,
          ...(srv.args ? { args: srv.args } : {}),
          ...(srv.env ? { env: srv.env } : {}),
        };
      } else {
        delete newSchema.mcpServers[name];
      }
    }

    return newSchema;
  },
};
