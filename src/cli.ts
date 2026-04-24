#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import ora from 'ora';
import os from 'node:os';
import path from 'node:path';
import {
  readCanonicalConfig,
  writeCanonicalConfig,
} from './portable-format.js';
import { detectInstalledClients, ALL_ADAPTERS } from './clients/index.js';

const program = new Command();
const CANONICAL_PATH = path.join(os.homedir(), '.mcp-sync.yaml');

program
  .name('mcp-sync')
  .description('One CLI to manage MCP servers across every AI client you use')
  .version('0.1.0-alpha.0');

program
  .command('list')
  .description('Show installed servers across all detected clients')
  .action(async () => {
    const config = await readCanonicalConfig(CANONICAL_PATH);
    const servers = Object.keys(config.mcpServers);

    if (servers.length === 0) {
      console.log(pc.yellow('No MCP servers found in canonical config.'));
      return;
    }

    console.log(pc.bold(pc.blue('Canonical MCP Servers:')));
    for (const name of servers) {
      const srv = config.mcpServers[name];
      console.log(`  ${pc.green('•')} ${pc.bold(name)}`);
      console.log(
        `    ${pc.dim('Command:')} ${srv.command} ${srv.args?.join(' ') || ''}`,
      );
      console.log(
        `    ${pc.dim('Enabled for:')} ${srv.enabledFor?.join(', ') || 'all'}`,
      );
    }
  });

program
  .command('add <name>')
  .description('Add a new server')
  .option('-c, --command <cmd>', 'Command to run')
  .option('-a, --args [args...]', 'Arguments')
  .option(
    '--from-github <repo>',
    'Fetch config from GitHub repo (e.g. org/repo)',
  )
  .action(async (name, options) => {
    let finalCommand = options.command;
    let finalArgs = options.args || [];

    if (options.fromGithub) {
      const spinner = ora(
        `Fetching README from ${options.fromGithub}...`,
      ).start();
      try {
        const { request } = await import('undici');
        const urls = [
          `https://raw.githubusercontent.com/${options.fromGithub}/main/README.md`,
          `https://raw.githubusercontent.com/${options.fromGithub}/master/README.md`,
        ];

        let text = '';
        for (const url of urls) {
          const { statusCode, body } = await request(url);
          if (statusCode === 200) {
            text = await body.text();
            break;
          }
        }

        if (!text) throw new Error('README not found');

        const cmdMatch = text.match(/"command"\s*:\s*"([^"]+)"/);
        const argsMatch = text.match(/"args"\s*:\s*\[(.*?)\]/s);

        if (cmdMatch) {
          finalCommand = cmdMatch[1];
          spinner.succeed(`Found command: ${finalCommand}`);
          if (argsMatch) {
            const argsStr = argsMatch[1].replace(/"/g, '').trim();
            finalArgs = argsStr
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean);
            console.log(pc.dim(`  Found args: [${finalArgs.join(', ')}]`));
          }
        } else {
          spinner.fail('Could not parse command from README.');
          process.exit(1);
        }
      } catch (err: any) {
        spinner.fail(`Failed to fetch from GitHub: ${err.message}`);
        process.exit(1);
      }
    }

    if (!finalCommand) {
      console.error(
        pc.red('Error: --command is required or use --from-github'),
      );
      process.exit(1);
    }

    const config = await readCanonicalConfig(CANONICAL_PATH);
    config.mcpServers[name] = {
      command: finalCommand,
      args: finalArgs,
      enabledFor: ['all'],
    };

    await writeCanonicalConfig(CANONICAL_PATH, config);
    console.log(pc.green(`✔ Added server '${name}'`));
    console.log(pc.dim(`Run 'mcp-sync sync' to apply changes to clients.`));
  });

program
  .command('remove <name>')
  .description('Remove a server')
  .action(async (name) => {
    const config = await readCanonicalConfig(CANONICAL_PATH);
    if (!config.mcpServers[name]) {
      console.error(
        pc.red(`Error: Server '${name}' not found in canonical config.`),
      );
      process.exit(1);
    }

    delete config.mcpServers[name];
    await writeCanonicalConfig(CANONICAL_PATH, config);
    console.log(pc.green(`✔ Removed server '${name}'`));
    console.log(pc.dim(`Run 'mcp-sync sync' to apply changes to clients.`));
  });

program
  .command('sync')
  .description('Sync configuration to all detected clients')
  .action(async () => {
    const spinner = ora('Reading canonical config...').start();
    const config = await readCanonicalConfig(CANONICAL_PATH);

    spinner.text = 'Detecting installed clients...';
    const clients = await detectInstalledClients();

    if (clients.length === 0) {
      spinner.fail('No supported clients detected on this system.');
      return;
    }

    spinner.text = 'Syncing...';
    for (const client of clients) {
      const currentSchema = await client.readConfig();
      const newSchema = client.canonicalToSchema(config, currentSchema);
      await client.writeConfig(newSchema);
    }

    spinner.succeed(
      `Successfully synced to ${clients.length} clients: ${clients.map((c) => c.name).join(', ')}`,
    );
  });

program
  .command('enable <name>')
  .description('Enable a server for specific clients (comma-separated)')
  .option('--for <clients>', 'Comma-separated list of client IDs')
  .action(async (name, options) => {
    if (!options.for) {
      console.error(
        pc.red('Error: --for is required (e.g. --for claude-desktop,cursor)'),
      );
      process.exit(1);
    }

    const config = await readCanonicalConfig(CANONICAL_PATH);
    if (!config.mcpServers[name]) {
      console.error(pc.red(`Error: Server '${name}' not found.`));
      process.exit(1);
    }

    const targetClients = options.for.split(',').map((c: string) => c.trim());
    const current = config.mcpServers[name].enabledFor || [];

    if (current.includes('all')) {
      config.mcpServers[name].enabledFor = targetClients;
    } else {
      config.mcpServers[name].enabledFor = [
        ...new Set([...current, ...targetClients]),
      ];
    }

    await writeCanonicalConfig(CANONICAL_PATH, config);
    console.log(
      pc.green(`✔ Enabled server '${name}' for ${targetClients.join(', ')}`),
    );
  });

program
  .command('disable <name>')
  .description('Disable a server for specific clients (comma-separated)')
  .option('--for <clients>', 'Comma-separated list of client IDs')
  .action(async (name, options) => {
    if (!options.for) {
      console.error(pc.red('Error: --for is required'));
      process.exit(1);
    }

    const config = await readCanonicalConfig(CANONICAL_PATH);
    if (!config.mcpServers[name]) {
      console.error(pc.red(`Error: Server '${name}' not found.`));
      process.exit(1);
    }

    const targetClients = options.for.split(',').map((c: string) => c.trim());
    let current = config.mcpServers[name].enabledFor || ['all'];

    if (current.includes('all')) {
      const allIds = ALL_ADAPTERS.map((a) => a.id);
      current = allIds;
    }

    config.mcpServers[name].enabledFor = current.filter(
      (c: string) => !targetClients.includes(c),
    );

    await writeCanonicalConfig(CANONICAL_PATH, config);
    console.log(
      pc.green(`✔ Disabled server '${name}' for ${targetClients.join(', ')}`),
    );
  });

program
  .command('export')
  .description('Export configuration to stdout (YAML format)')
  .action(async () => {
    const config = await readCanonicalConfig(CANONICAL_PATH);
    const yaml = await import('yaml');
    console.log(yaml.stringify(config));
  });

program
  .command('import <file>')
  .description('Import configuration from a YAML file')
  .action(async (file) => {
    const fs = await import('node:fs/promises');
    const content = await fs.readFile(file, 'utf8');
    const yaml = await import('yaml');
    const parsed = yaml.parse(content);
    await writeCanonicalConfig(CANONICAL_PATH, parsed);
    console.log(pc.green(`✔ Imported config from ${file}`));
  });

program
  .command('doctor')
  .description('Verify binaries in canonical config exist on PATH')
  .action(async () => {
    const config = await readCanonicalConfig(CANONICAL_PATH);
    const { execa } = await import('execa');

    let hasErrors = false;
    for (const [name, srv] of Object.entries(config.mcpServers)) {
      try {
        if (os.platform() === 'win32') {
          await execa('where', [srv.command]);
        } else {
          await execa('which', [srv.command]);
        }
        console.log(
          `  ${pc.green('✔')} ${pc.bold(name)}: binary '${srv.command}' found.`,
        );
      } catch {
        console.log(
          `  ${pc.red('✖')} ${pc.bold(name)}: binary '${srv.command}' not found on PATH!`,
        );
        hasErrors = true;
      }
    }

    if (hasErrors) {
      console.log(
        pc.yellow('\nSome servers may fail to start due to missing binaries.'),
      );
    } else {
      console.log(pc.green('\nAll server binaries found!'));
    }
  });

program
  .command('diff')
  .description('Show config drift between canonical and installed clients')
  .action(async () => {
    const config = await readCanonicalConfig(CANONICAL_PATH);
    const clients = await detectInstalledClients();

    if (clients.length === 0) {
      console.log(pc.yellow('No supported clients detected.'));
      return;
    }

    let driftFound = false;
    for (const client of clients) {
      const currentSchema = await client.readConfig();
      const expectedSchema = client.canonicalToSchema(config, currentSchema);

      const currentStr = JSON.stringify(currentSchema, null, 2);
      const expectedStr = JSON.stringify(expectedSchema, null, 2);

      if (currentStr !== expectedStr) {
        console.log(pc.yellow(`\nDrift detected in ${client.name}:`));
        driftFound = true;
        console.log(pc.dim('  Run `mcp-sync sync` to fix this.'));
      } else {
        console.log(pc.green(`✔ ${client.name} is in sync.`));
      }
    }

    if (!driftFound) {
      console.log(pc.green('\nAll clients are perfectly synced!'));
    }
  });

program.parse(process.argv);
