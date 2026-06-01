module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Метод не разрешён' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email обязателен' });

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  await fetch(
    'https://apparent-leech-40158.upstash.io/set/' + email + '/' + code + '?EX=300',
    {
      headers: {
        Authorization: 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ'
      }
    }
  );

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.com',
    port: 465,
    secure: true,
    auth: {
      user: 'ITKub2026@yandex.com',
      pass: 'isrufctjvhzabfws'
    }
  });

  const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          
          <!-- Шапка -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:36px 24px;text-align:center;border-radius:20px 20px 0 0;">
              <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-block;font-size:28px;line-height:56px;">🔐</div>
              <h1 style="color:#ffffff;font-size:22px;font-weight:600;margin:16px 0 4px;">Код подтверждения</h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">IT-КУБ — регистрация на мероприятие</p>
            </td>
          </tr>

          <!-- Код -->
          <tr>
            <td style="padding:36px 24px;text-align:center;">
              <p style="color:#888;font-size:13px;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;">Ваш код подтверждения</p>
              <div style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:16px;padding:24px 16px;display:inline-block;">
                <span style="color:#1a1a1a;font-size:38px;font-weight:700;letter-spacing:12px;">${code}</span>
              </div>
              <p style="color:#aaa;font-size:13px;margin:20px 0 0;">Код действителен 5 минут</p>
            </td>
          </tr>

          <!-- Подвал -->
          <tr>
            <td style="padding:24px;border-top:1px solid #f0f0f0;text-align:center;background:#fafafa;border-radius:0 0 20px 20px;">
              <p style="color:#aaa;font-size:12px;margin:0;">Если вы не запрашивали код — просто проигнорируйте это письмо</p>
              <p style="color:#ccc;font-size:11px;margin:8px 0 0;">IT-КУБ © 2026</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: '"IT-КУБ" <ITKub2026@yandex.com>',
      to: email,
      subject: 'Код подтверждения регистрации',
      html: emailBody
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Ошибка отправки:', err);
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