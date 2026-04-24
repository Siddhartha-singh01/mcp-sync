import { describe, it, expect } from 'vitest';
import { claudeDesktopAdapter } from '../src/clients/claude-desktop.js';
import { cursorAdapter } from '../src/clients/cursor.js';
import { claudeCodeAdapter } from '../src/clients/claude-code.js';
import { windsurfAdapter } from '../src/clients/windsurf.js';
import type { CanonicalConfig } from '../src/types.js';

const mockCanonical: CanonicalConfig = {
  mcpServers: {
    'test-server': {
      command: 'npx',
      args: ['-y', '@test/server'],
      env: { API_KEY: 'test' },
      enabledFor: ['claude-desktop', 'cursor']
    },
    'global-server': {
      command: 'python',
      args: ['-m', 'server'],
      enabledFor: ['all']
    }
  }
};

describe('Client Adapters Schema Conversion', () => {
  it('claude-desktop canonicalToSchema matches snapshot', () => {
    const result = claudeDesktopAdapter.canonicalToSchema(mockCanonical, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "global-server": {
            "args": [
              "-m",
              "server",
            ],
            "command": "python",
          },
          "test-server": {
            "args": [
              "-y",
              "@test/server",
            ],
            "command": "npx",
            "env": {
              "API_KEY": "test",
            },
          },
        },
      }
    `);
  });

  it('cursor canonicalToSchema matches snapshot', () => {
    const result = cursorAdapter.canonicalToSchema(mockCanonical, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "global-server": {
            "args": [
              "-m",
              "server",
            ],
            "command": "python",
          },
          "test-server": {
            "args": [
              "-y",
              "@test/server",
            ],
            "command": "npx",
            "env": {
              "API_KEY": "test",
            },
          },
        },
      }
    `);
  });

  it('claude-code canonicalToSchema matches snapshot', () => {
    const result = claudeCodeAdapter.canonicalToSchema(mockCanonical, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "global-server": {
            "args": [
              "-m",
              "server",
            ],
            "command": "python",
          },
        },
      }
    `);
  });
  
  it('windsurf canonicalToSchema matches snapshot', () => {
    const result = windsurfAdapter.canonicalToSchema(mockCanonical, {});
    expect(result).toMatchInlineSnapshot(`
      {
        "mcpServers": {
          "global-server": {
            "args": [
              "-m",
              "server",
            ],
            "command": "python",
          },
        },
      }
    `);
  });
});
