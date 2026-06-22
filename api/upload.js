const path = require('path');
const fs   = require('fs');

const USE_KV = !!(process.env.KV_REST_API_URL);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { filename, base64 } = req.body ?? {};
    if (!filename || !base64) return res.status(400).json({ error: 'Faltan campos' });

    const safe = path.basename(filename);
    if (!safe || safe.startsWith('.')) return res.status(400).json({ error: 'Nombre inválido' });

    if (USE_KV) {
      const { kv } = require('@vercel/kv');
      const key = `foto:${Date.now()}:${safe}`;
      await kv.set(key, { base64, filename: safe });
      const url = `/api/foto?k=${encodeURIComponent(key)}`;
      return res.status(200).json({ ok: true, url });
    }

    // Desarrollo local: guardar en uploads/
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(path.join(uploadsDir, safe), Buffer.from(base64, 'base64'));
    return res.status(200).json({ ok: true, url: `/fotos/${encodeURIComponent(safe)}` });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ error: err.message });
  }
};
