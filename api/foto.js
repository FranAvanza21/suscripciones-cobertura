const { kv } = require('@vercel/kv');

const MIME = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  gif: 'image/gif',  webp: 'image/webp', pdf: 'application/pdf',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

module.exports = async (req, res) => {
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = req.query?.k;
  if (!key) return res.status(400).json({ error: 'Falta k' });

  try {
    const data = await kv.get(key);
    if (!data) return res.status(404).json({ error: 'No encontrada' });

    const { base64, filename } = data;
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    const buffer = Buffer.from(base64, 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.status(200).end(buffer);
  } catch (err) {
    console.error('[foto]', err);
    return res.status(500).json({ error: err.message });
  }
};
