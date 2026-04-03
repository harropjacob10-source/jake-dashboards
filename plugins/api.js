/**
 * Skills & Plugins API
 * Reads directly from ~/.claude/ — no upstream server needed.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

function parseMarkdownFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return { name: '', description: '' };
    const yaml = match[1];
    const name = (yaml.match(/^name:\s*(.+)$/m) || [])[1]?.trim().replace(/['"]/g, '') || '';
    // description can be multi-line (YAML >)
    const descMatch = yaml.match(/^description:\s*[>|]?\s*([\s\S]*?)(?=\n\w|\n---$|$)/m);
    let description = descMatch ? descMatch[1].replace(/\n\s+/g, ' ').trim().replace(/['"]/g, '') : '';
    const tools = (yaml.match(/^(?:tools|allowed-tools):\s*(.+)$/m) || [])[1]?.trim() || '';
    return { name, description, tools };
}

function readAgents() {
    const dir = path.join(CLAUDE_DIR, 'agents');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .map(f => {
            const content = fs.readFileSync(path.join(dir, f), 'utf8');
            const meta = parseMarkdownFrontmatter(content);
            const name = meta.name || f.replace('.md', '');
            return {
                id: name,
                name,
                description: meta.description || 'No description',
                tools: meta.tools,
                type: 'agent',
                file: f,
                path: path.join(dir, f),
                active: true,
            };
        });
}

function readCommands() {
    const dirs = [
        { dir: path.join(CLAUDE_DIR, 'commands'), scope: 'personal' },
        { dir: path.join(process.cwd(), '.claude', 'commands'), scope: 'project' },
    ];
    const results = [];
    for (const { dir, scope } of dirs) {
        if (!fs.existsSync(dir)) continue;
        fs.readdirSync(dir).filter(f => f.endsWith('.md')).forEach(f => {
            const content = fs.readFileSync(path.join(dir, f), 'utf8');
            const meta = parseMarkdownFrontmatter(content);
            const name = meta.name || f.replace('.md', '');
            results.push({
                id: `${scope}-${name}`,
                name,
                description: meta.description || 'No description',
                type: 'command',
                scope,
                file: f,
                path: path.join(dir, f),
                active: true,
            });
        });
    }
    return results;
}

function readSkills() {
    const dir = path.join(CLAUDE_DIR, 'skills');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => fs.statSync(path.join(dir, f)).isDirectory())
        .map(skillDir => {
            const skillPath = path.join(dir, skillDir);
            const skillMd = path.join(skillPath, 'SKILL.md');
            if (!fs.existsSync(skillMd)) return null;
            const content = fs.readFileSync(skillMd, 'utf8');
            const meta = parseMarkdownFrontmatter(content);
            const name = meta.name || skillDir;
            const files = fs.readdirSync(skillPath);
            return {
                id: name,
                name,
                description: meta.description || 'No description',
                type: 'skill',
                dir: skillDir,
                path: skillPath,
                fileCount: files.length,
                active: true,
            };
        })
        .filter(Boolean);
}

function readPlugins() {
    const installedPath = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');
    if (!fs.existsSync(installedPath)) return [];
    try {
        const data = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
        return Object.entries(data).map(([name, info]) => ({
            id: name,
            name,
            description: info.description || 'No description',
            version: info.version || '',
            type: 'plugin',
            active: info.enabled !== false,
            components: info.components || {},
        }));
    } catch {
        return [];
    }
}

function togglePlugin(name, enabled) {
    const installedPath = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');
    if (!fs.existsSync(installedPath)) return false;
    const data = JSON.parse(fs.readFileSync(installedPath, 'utf8'));
    if (!data[name]) return false;
    data[name].enabled = enabled;
    fs.writeFileSync(installedPath, JSON.stringify(data, null, 2));
    return true;
}

module.exports = { readAgents, readCommands, readSkills, readPlugins, togglePlugin };
