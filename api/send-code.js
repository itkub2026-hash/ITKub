const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не разрешён' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });

  const code = Math.floor(10000 + Math.random() * 90000).toString();

  // Сохраняем код в Upstash Redis
  await fetch(
    'https://apparent-leech-40158.upstash.io/set/' + email + '/' + code + '?EX=300',
    {
      headers: {
        Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
      }
    }
  );

  // Отправляем письмо через Яндекс SMTP
  const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true,
    auth: {
      user: 'ITKub2026@yandex.com',
      pass: 'mqbbyeckqtpsiwuz'
    }
  });

  try {
    await transporter.sendMail({
      from: 'ITKub2026@yandex.com',
      to: email,
      subject: 'Код подтверждения регистрации',
      html: '<h2>Код подтверждения регистрации</h2><p style="font-size:28px;letter-spacing:4px;"><strong>' + code + '</strong></p><p>Код действителен 5 минут.</p>'
    });
    res.status(200).json({ success: true });
  } catch (err) {
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