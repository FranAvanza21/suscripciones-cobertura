const path = require('path');
const { put } = require('@vercel/blob');

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

    const buffer = Buffer.from(base64, 'base64');
    const { url } = await put(safe, buffer, { access: 'public', addRandomSuffix: false });

    return res.status(200).json({ ok: true, url });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ error: err.message });
  }
};
