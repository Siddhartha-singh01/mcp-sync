import { claudeDesktopAdapter } from './claude-desktop.js';
import { cursorAdapter } from './cursor.js';
import { claudeCodeAdapter } from './claude-code.js';
import { windsurfAdapter } from './windsurf.js';

export const ALL_ADAPTERS = [
  claudeDesktopAdapter,
  cursorAdapter,
  claudeCodeAdapter,
  windsurfAdapter,
];

export async function detectInstalledClients() {
  const installed = [];
  for (const adapter of ALL_ADAPTERS) {
    if (await adapter.detect()) {
      installed.push(adapter);
    }
  }
  return installed;
}
