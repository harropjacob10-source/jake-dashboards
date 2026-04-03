/**
 * Jake's Dashboards — Unified Server
 *
 * Starts three servers:
 *   http://localhost:4000  — Home page (links to both dashboards)
 *   http://localhost:4444  — Analytics Dashboard (proxies to localhost:3333)
 *   http://localhost:4445  — Plugin Manager     (proxies to localhost:3336)
 *
 * Usage:
 *   1. npx claude-code-templates@latest --analytics   (terminal 1)
 *   2. npx claude-code-templates@latest --plugins     (terminal 2)
 *   3. npm start                                       (terminal 3)
 */

const http = require('http');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

function startServer({ name, port, upstream, staticDir }) {
    const app = express();

    app.use(express.static(staticDir));

    if (upstream) {
        app.use('/api', createProxyMiddleware({ target: upstream, changeOrigin: true, logLevel: 'silent' }));
        app.use('/ws',  createProxyMiddleware({ target: upstream, changeOrigin: true, ws: true, logLevel: 'silent' }));
    }

    app.get('*', (req, res) => {
        res.sendFile(path.join(staticDir, 'index.html'));
    });

    const server = http.createServer(app);

    if (upstream) {
        server.on('upgrade', (req, socket, head) => {
            const proxy = createProxyMiddleware({ target: upstream, changeOrigin: true, ws: true, logLevel: 'silent' });
            proxy.upgrade(req, socket, head);
        });
    }

    server.listen(port, () => {
        console.log(`  ✓ ${name.padEnd(22)} http://localhost:${port}`);
    });
}

console.log('\n  Jake\'s Dashboards\n');

startServer({
    name: 'Home',
    port: 4000,
    staticDir: path.join(__dirname, 'home'),
});

startServer({
    name: 'Analytics Dashboard',
    port: 4444,
    upstream: 'http://localhost:3333',
    staticDir: path.join(__dirname, 'analytics/src'),
});

startServer({
    name: 'Plugin Manager',
    port: 4445,
    upstream: 'http://localhost:3336',
    staticDir: path.join(__dirname, 'plugins/src'),
});

console.log('\n  Open http://localhost:4000 to get started\n');
