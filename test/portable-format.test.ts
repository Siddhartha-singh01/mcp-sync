import fs from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import {
  readCanonicalConfig,
  writeCanonicalConfig,
} from '../src/portable-format.js';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

describe('portable-format', () => {
  it('reads config successfully', async () => {
    vi.mocked(fs.readFile).mockResolvedValueOnce(
      'mcpServers:\n  test:\n    command: "npx"',
    );
    const res = await readCanonicalConfig('test.yaml');
    expect(res.mcpServers.test.command).toBe('npx');
  });

  it('handles ENOENT gracefully', async () => {
    const error: any = new Error('Not found');
    error.code = 'ENOENT';
    vi.mocked(fs.readFile).mockRejectedValueOnce(error);
    const res = await readCanonicalConfig('test.yaml');
    expect(res.mcpServers).toEqual({});
  });

  it('writes config', async () => {
    await writeCanonicalConfig('test.yaml', { mcpServers: {} });
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
