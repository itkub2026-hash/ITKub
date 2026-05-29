module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не разрешён' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });

  const code = Math.floor(10000 + Math.random() * 90000).toString();

  await fetch(
    'https://apparent-leech-40158.upstash.io/set/' + email + '/' + code + '?EX=300',
    {
      headers: {
        Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
      }
    }
  );

  const params = new URLSearchParams({
    format: 'json',
    api_key: '6setnrafq34frx4jr4dc4w66tyb5w3bh189sgtfe',
    email: email,
    sender_name: 'IT-КУБ',
    sender_email: 'itkub2026@gmail.com',
    subject: 'Код подтверждения регистрации',
    body: '<h2>Код подтверждения регистрации</h2><p style="font-size:28px;letter-spacing:4px;"><strong>' + code + '</strong></p><p>Код действителен 5 минут.</p>'
  });

  const unisenderResponse = await fetch('https://api.unisender.com/ru/api/sendEmail?format=json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  const data = await unisenderResponse.json();

  if (data.result) {
    res.status(200).json({ success: true });
  } else {
    await fetch(
      'https://apparent-leech-40158.upstash.io/del/' + email,
      {
        headers: {
          Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
        }
      }
    );
    res.status(500).json({ error: 'Ошибка отправки письма' });
  }
};