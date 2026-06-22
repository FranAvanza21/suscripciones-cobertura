const path = require('path');
const fs   = require('fs');

const DATA_FILE   = process.env.VERCEL
  ? path.join('/tmp', 'suscripciones.json')
  : path.join(__dirname, '..', 'data', 'suscripciones.json');
const USE_KV      = !!(process.env.KV_REST_API_URL);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function load() {
  if (USE_KV) {
    const { kv } = require('@vercel/kv');
    return (await kv.get('suscripciones')) ?? [];
  }
  if (!fs.existsSync(DATA_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return []; }
}

async function save(data) {
  if (USE_KV) {
    const { kv } = require('@vercel/kv');
    await kv.set('suscripciones', data);
    return;
  }
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function checkAuth(req) {
  const key = process.env.SUSCRIPCIONES_API_KEY;
  if (!key) return true;
  const auth = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
  return auth === key;
}

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!checkAuth(req))          return res.status(401).json({ error: 'No autorizado' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json(await load());
    }

    if (req.method === 'POST') {
      const sub  = { ...(req.body ?? {}), id: Date.now(), fecha: new Date().toISOString() };
      const data = await load();
      data.unshift(sub);
      await save(data);
      return res.status(201).json({ ok: true, id: sub.id });
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id;
      if (id) {
        const data = await load();
        await save(data.filter(s => String(s.id) !== String(id)));
      } else {
        await save([]);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    console.error('[suscripciones]', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
