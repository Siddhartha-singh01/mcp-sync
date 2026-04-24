# mcp-sync

> **One CLI to manage MCP servers across every AI client you use.**

### Why it exists
MCP users run 3–6 clients: Claude Desktop, Cursor, Windsurf, Zed, Continue, VS Code, and more. Every client has a different config location and schema. Installing a new MCP server means manually editing 6 JSON files. `mcp-sync` solves this by giving you a single command to sync your servers across every client simultaneously.

### Installation
```bash
npm install -g mcp-sync
```

### CLI Commands

#### 1. List installed servers
```bash
mcp-sync list
```
*Shows installed servers across all detected clients.*

#### 2. Add a new server
```bash
mcp-sync add filesystem --command npx --args -y @modelcontextprotocol/server-filesystem /Users/me/data
```
*Adds a new server to your canonical configuration.*

#### 3. Add directly from GitHub
```bash
mcp-sync add --from-github modelcontextprotocol/servers
```
*Automatically scrapes the install snippet from the GitHub README.*

#### 4. Remove a server
```bash
mcp-sync remove filesystem
```
*Removes the server from all clients.*

#### 5. Enable / Disable for specific clients
```bash
mcp-sync enable filesystem --for claude-desktop,cursor
mcp-sync disable filesystem --for windsurf
```

#### 6. Sync configuration
```bash
mcp-sync sync
```
*Ensures every enabled server is present and correctly formatted in every target client's config.*

#### 7. View config drift
```bash
mcp-sync diff
```
*Shows the differences between your canonical config and the actual JSON files used by the clients.*

#### 8. Import / Export
```bash
mcp-sync export > mcp-servers.yaml
mcp-sync import mcp-servers.yaml
```
*Export or import your complete server configuration for easy backup or sharing.*

#### 9. Health Checks
```bash
mcp-sync doctor
```
*Detects broken paths, missing binaries, and authentication misconfigurations.*

### Programmatic API
```ts
import { clients, readConfig, addServer } from 'mcp-sync';

const all = await clients.detect(); 
const cfg = await readConfig('cursor');
await addServer({ name: 'fs', command: 'npx', args: ['-y', '@mcp/fs'] }, { targets: ['all'] });
```
