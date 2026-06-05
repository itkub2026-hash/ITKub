module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';

  if (req.method === 'GET') {
    // Получаем счётчики
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{}');
    return res.status(200).json(counters);
  }

  if (req.method === 'POST') {
    // Сохраняем счётчики
    const counters = req.body;
    await fetch(`${UPSTASH}/set/counters`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(counters)
    });
    return res.status(200).json({ success: true });
  }
};