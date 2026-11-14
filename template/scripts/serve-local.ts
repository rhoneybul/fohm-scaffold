/**
 * Full-stack local server: the static web export (dist/) plus the real /api
 * handlers, the same way Vercel serves them. For local testing against a
 * local Postgres:
 *   SUPABASE_DB_URL=postgresql://… npm run migrate
 *   SUPABASE_DB_URL=postgresql://… npm run serve:local
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import * as accounts from '../api/accounts';
import * as data from '../api/data';
import * as ai from '../api/ai';
import * as billing from '../api/billing';
import * as health from '../api/health';
import * as stripeWebhook from '../api/stripe-webhook';

const ROUTES: Record<string, Record<string, (r: Request) => Promise<Response>>> = {
  '/api/accounts': accounts,
  '/api/data': data,
  '/api/health': health,
  '/api/ai': ai,
  '/api/billing': billing,
  '/api/stripe-webhook': stripeWebhook,
};
const DIST = path.resolve('dist');
const PORT = Number(process.env.PORT ?? 4321);
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.json': 'application/json' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
    const route = ROUTES[url.pathname];
    if (route) {
      const fn = route[req.method ?? 'GET'];
      if (!fn) return void res.writeHead(405).end();
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = chunks.length ? Buffer.concat(chunks) : undefined;
      const out = await fn(new Request(url, { method: req.method, headers: req.headers as any, body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body }));
      res.writeHead(out.status, Object.fromEntries(out.headers));
      return void res.end(Buffer.from(await out.arrayBuffer()));
    }
    let file = path.join(DIST, decodeURIComponent(url.pathname));
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Serving dist + /api on http://localhost:${PORT}`));
