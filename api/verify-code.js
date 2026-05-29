module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не разрешён' });

  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email и код обязательны' });

  const response = await fetch(
    'https://apparent-leech-40158.upstash.io/get/' + email,
    {
      headers: {
        Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
      }
    }
  );

  const data = await response.json();
  const storedCode = data.result;

  if (!storedCode) return res.status(400).json({ error: 'Код истёк или не найден' });
  if (storedCode !== code) return res.status(400).json({ error: 'Неверный код' });

  await fetch(
    'https://apparent-leech-40158.upstash.io/del/' + email,
    {
      headers: {
        Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
      }
    }
  );

  res.status(200).json({ success: true });
};