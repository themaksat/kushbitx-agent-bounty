import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

const required = [
  'SKILL.md',
  'README.md',
  'DEMO.md',
  'agents/openai.yaml',
  'references/tools.md',
  'references/security.md',
];

for (const rel of required) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) {
    throw new Error(`missing required file: ${rel}`);
  }
}

const skill = fs.readFileSync(path.join(root, 'SKILL.md'), 'utf8');
const openai = fs.readFileSync(path.join(root, 'agents/openai.yaml'), 'utf8');
const tools = fs.readFileSync(path.join(root, 'references/tools.md'), 'utf8');
const security = fs.readFileSync(path.join(root, 'references/security.md'), 'utf8');
const demo = fs.readFileSync(path.join(root, 'DEMO.md'), 'utf8');

const checks = [
  [skill.includes('name: mermail-tender-desk'), 'frontmatter name'],
  [skill.includes('https://docs.mermail.app/ai/skills'), 'Mermail homepage'],
  [skill.includes('MERMAIL_API_KEY'), 'environment metadata'],
  [openai.includes('value: "mermail"'), 'Mermail MCP dependency'],
  [openai.includes('https://console.mermail.app/mcp'), 'MCP URL'],
  [tools.includes('search_emails'), 'bounded inbox search'],
  [tools.includes('get_email'), 'selected email read'],
  [tools.includes('download_attachment'), 'attachment contract'],
  [tools.includes('save_draft'), 'draft-only write path'],
  [security.includes('Never submit a bid'), 'no autonomous bid submission'],
  [security.includes('Never pay a registration fee'), 'no autonomous tender payment'],
  [security.includes('sender_authentication.status'), 'sender authentication contract'],
  [demo.includes('Synthetic demo'), 'synthetic demo disclosure'],
  [demo.includes('needs_clarification'), 'demo decision state'],
];

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length) {
  console.error('mermail-tender-desk validation: FAIL');
  for (const label of failed) console.error(`- ${label}`);
  process.exit(1);
}

console.log('mermail-tender-desk validation: PASS');
