MaliRadar v0.5 — backend-ready starter
==========================================

WHAT THIS VERSION DOES
- Frontend remains usable as a mobile demo.
- Frontend pings /api/health and reports whether a backend is available.
- A Node/Express API is included.
- Demo users, paper transactions and alerts can be stored server-side.
- The frontend falls back to local browser storage until the server is deployed.

PROJECT
public/index.html
server.js
package.json
data/demo-db.json (created automatically when server starts)

LOCAL DEVELOPMENT (requires a computer/Node.js)
1. Open a terminal in this folder.
2. Run: npm install
3. Run: npm start
4. Open: http://localhost:3000

IMPORTANT
This is NOT production authentication or a real trading system.
The JSON database is only a development placeholder.
Before production: use a managed database, password hashing, sessions/JWT with secure storage,
rate limiting, audit logs, HTTPS, secrets management, backups, monitoring, and security review.
Do not connect real customer money or CDS credentials to this starter.

REAL MARKET DATA
The stock prices in the demo are illustrative. A production version must use an authorized/
appropriate market-data source and respect its terms/licensing.

REGULATORY
Real-money execution, custody, investment advice and related services need to be structured
with the appropriate Kenyan licensed/regulated partners and approvals before launch.
