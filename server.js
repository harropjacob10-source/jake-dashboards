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
    app.use(express.static(path.join(__dirname, 'analytics/src')));
    app.use('/api', createProxyMiddleware({ target: upstream, changeOrigin: true, logLevel: 'silent' }));
    app.use('/ws',  createProxyMiddleware({ target: upstream, changeOrigin: true, ws: true, logLevel: 'silent' }));
    app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'analytics/src/index.html')));
    const server = http.createServer(app);
    server.on('upgrade', (req, socket, head) => {
        createProxyMiddleware({ target: upstream, changeOrigin: true, ws: true, logLevel: 'silent' }).upgrade(req, socket, head);
    });
    server.listen(4444, () => {
        console.log(`  ✓ Analytics Dashboard    http://localhost:4444`);
    });
}

// ── Skills & Plugin Manager (standalone) ─────────────────────────────────────
function startPluginServer() {
    const app = express();
    app.use(express.json());
    app.use(express.static(path.join(__dirname, 'plugins/src')));

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
