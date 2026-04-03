# Jake's Dashboards

Combined Claude Code dashboards built by [Jake Harrop](https://github.com/harropjacob10-source).

One repo, one command — launches the home page, Analytics Dashboard, and Plugin Manager all at once.

## What's included

| Dashboard | Port | Description |
|---|---|---|
| 🏠 Home | 4000 | Landing page linking to both dashboards |
| 📊 Analytics | 4444 | Real-time Claude Code session monitoring |
| 🔌 Plugin Manager | 4445 | Browse and inspect installed skills & plugins |

## Quick Installation

### Prerequisites

- [Node.js](https://nodejs.org/) v16+
- [Claude Code](https://claude.ai/code) installed

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/harropjacob10-source/jake-dashboards.git
cd jake-dashboards

# 2. Install dependencies
npm install

# 3. Start the Claude Code data servers
npx claude-code-templates@latest --analytics   # terminal 1
npx claude-code-templates@latest --plugins     # terminal 2

# 4. Start the dashboards
npm start                                       # terminal 3

# 5. Open
open http://localhost:4000
```

## Built by

**Jake Harrop** — [github.com/harropjacob10-source](https://github.com/harropjacob10-source)
