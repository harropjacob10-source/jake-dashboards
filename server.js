/**
 * Jake's Dashboards — Unified Server
 *
 * Starts three servers:
 *   http://localhost:4000  — Home page
 *   http://localhost:4444  — Analytics Dashboard (proxies to localhost:3333)
 *   http://localhost:4445  — Skills & Plugin Manager (standalone, reads ~/.claude/)
 *
 * Usage:
 *   1. npx claude-code-templates@latest --analytics   (terminal 1, for analytics only)
 *   2. npm start                                       (terminal 2)
 */

const http = require('http');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const { readAgents, readCommands, readSkills, readPlugins, togglePlugin } = require('./plugins/api');

// ── Home server ──────────────────────────────────────────────────────────────
function startHomeServer() {
    const app = express();
    app.use(express.static(path.join(__dirname, 'home')));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'home/index.html')));
    http.createServer(app).listen(4000, () => {
        console.log(`  ✓ Home                   http://localhost:4000`);
    });
}

// ── Analytics proxy server ────────────────────────────────────────────────────
function startAnalyticsServer() {
    const app = express();
    const upstream = 'http://localhost:3333';
    const wsProxy = createProxyMiddleware({ target: upstream, changeOrigin: true, ws: true, logLevel: 'silent' });
    app.use(express.static(path.join(__dirname, 'analytics/src')));
    app.use('/api', createProxyMiddleware({ target: upstream, changeOrigin: true, logLevel: 'silent' }));
    app.use('/ws', wsProxy);
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'analytics/src/index.html')));
    const server = http.createServer(app);
    server.on('upgrade', (req, socket, head) => wsProxy.upgrade(req, socket, head));
    server.listen(4444, () => {
        console.log(`  ✓ Analytics Dashboard    http://localhost:4444`);
    });
}

// ── Skills & Plugin Manager (standalone) ─────────────────────────────────────
function startPluginServer() {
    const os = require('os');
    const fs = require('fs');
    const CLAUDE_DIR = path.join(os.homedir(), '.claude');

    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'plugins/src')));

    // SSE clients waiting for file-system change events
    const sseClients = new Set();

    function notifyClients() {
        for (const res of sseClients) {
            try { res.write('data: update\n\n'); }
            catch { sseClients.delete(res); }
        }
    }

    // Watch ~/.claude subdirs for any changes
    const watchDirs = ['skills', 'agents', 'commands', path.join('plugins', 'installed_plugins.json')];
    for (const rel of watchDirs) {
        const target = path.join(CLAUDE_DIR, rel);
        try {
            fs.watch(target, { recursive: true }, () => notifyClients());
        } catch {}
    }

    // SSE endpoint — browser connects here to receive live updates
    app.get('/api/watch', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        sseClients.add(res);
        req.on('close', () => sseClients.delete(res));
    });

    // API — return all items grouped by type
    app.get('/api/all', (req, res) => {
        res.json({
            agents:   readAgents(),
            commands: readCommands(),
            skills:   readSkills(),
            plugins:  readPlugins(),
        });
    });

    app.get('/api/agents',   (req, res) => res.json(readAgents()));
    app.get('/api/commands', (req, res) => res.json(readCommands()));
    app.get('/api/skills',   (req, res) => res.json(readSkills()));
    app.get('/api/plugins',  (req, res) => res.json(readPlugins()));

    // Toggle plugin active state
    app.post('/api/plugins/:name/toggle', (req, res) => {
        const { name } = req.params;
        const { enabled } = req.body;
        const ok = togglePlugin(name, enabled);
        res.json({ success: ok });
    });

    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'plugins/src/index.html')));
    http.createServer(app).listen(4445, () => {
        console.log(`  ✓ Skills & Plugin Manager http://localhost:4445`);
    });
}

console.log('\n  Jake\'s Dashboards\n');
startHomeServer();
startAnalyticsServer();
startPluginServer();
console.log('\n  Open http://localhost:4000 to get started\n');
