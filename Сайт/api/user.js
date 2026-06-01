const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';
  const { action } = req.body;

  // Нормализация телефона
  function normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits[0] === '8') return '7' + digits.slice(1);
    if (digits.length === 11 && digits[0] === '7') return digits;
    return digits;
  }

  // Проверка существования почты
  if (action === 'check-email') {
    const { email } = req.body;
    const checkResp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const checkData = await checkResp.json();
    return res.status(200).json({ exists: !!checkData.result });
  }

  // Проверка существования телефона
  if (action === 'check-phone') {
    let { phone } = req.body;
    phone = normalizePhone(phone);
    const keysResp = await fetch(`${UPSTASH}/keys/user:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    if (keysData.result) {
      for (const key of keysData.result) {
        const userResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const userData = await userResp.json();
        if (userData.result) {
          const user = JSON.parse(userData.result);
          if (normalizePhone(user.phone) === phone) return res.status(200).json({ exists: true });
        }
      }
    }
    return res.status(200).json({ exists: false });
  }

  // Регистрация
  if (action === 'register') {
    const { fullName, firstName, lastName, email, password } = req.body;
    let { phone } = req.body;
    phone = normalizePhone(phone);

    const checkResp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const checkData = await checkResp.json();
    if (checkData.result) return res.status(400).json({ success: false, error: 'Аккаунт с такой почтой уже существует' });

    const keysResp = await fetch(`${UPSTASH}/keys/user:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    if (keysData.result) {
      for (const key of keysData.result) {
        const userResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const userData = await userResp.json();
        if (userData.result) {
          const u = JSON.parse(userData.result);
          if (normalizePhone(u.phone) === phone) return res.status(400).json({ success: false, error: 'Этот номер телефона уже зарегистрирован' });
        }
      }
    }

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = {
      firstName: firstName || fullName?.split(' ')[0],
      lastName: lastName || fullName?.split(' ')[1] || '',
      fullName: fullName || (firstName + ' ' + lastName),
      email,
      phone,
      password: hash
    };

    await fetch(`${UPSTASH}/set/user:` + email, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return res.status(200).json({ success: true });
  }

  // Вход
  if (action === 'login') {
    const { email, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const resp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const user = JSON.parse(data.result || 'null');
    if (!user || user.password !== hash) return res.status(401).json({ success: false });
    return res.status(200).json({
      success: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone
      }
    });
  }

  // Смена email
  if (action === 'update-email') {
    const { oldEmail, newEmail } = req.body;

    const checkResp = await fetch(`${UPSTASH}/get/user:` + newEmail, { headers: { Authorization: AUTH } });
    const checkData = await checkResp.json();
    if (checkData.result) return res.status(400).json({ success: false, error: 'Эта почта уже используется' });

    const resp = await fetch(`${UPSTASH}/get/user:` + oldEmail, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const user = JSON.parse(data.result);
    user.email = newEmail;

    await fetch(`${UPSTASH}/set/user:` + newEmail, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    await fetch(`${UPSTASH}/del/user:` + oldEmail, { headers: { Authorization: AUTH } });

    const keysResp2 = await fetch(`${UPSTASH}/keys/userteam:${oldEmail}:*`, { headers: { Authorization: AUTH } });
    const keysData2 = await keysResp2.json();
    if (keysData2.result) {
      for (const key of keysData2.result) {
        const codeResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const codeData = await codeResp.json();
        if (codeData.result) {
          const newKey = key.replace(oldEmail, newEmail);
          await fetch(`${UPSTASH}/set/` + newKey + '/' + codeData.result, { headers: { Authorization: AUTH } });
          await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });

          const teamResp = await fetch(`${UPSTASH}/get/team:` + codeData.result, { headers: { Authorization: AUTH } });
          const teamData = await teamResp.json();
          if (teamData.result) {
            const team = JSON.parse(teamData.result);
            if (team.captain === oldEmail) team.captain = newEmail;
            const idx = team.members.indexOf(oldEmail);
            if (idx >= 0) team.members[idx] = newEmail;
            await fetch(`${UPSTASH}/set/team:` + codeData.result, {
              method: 'POST',
              headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
              body: JSON.stringify(team)
            });
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  }

  // Смена пароля
  if (action === 'update-password') {
    const { email, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const resp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const user = JSON.parse(data.result);
    user.password = hash;
    await fetch(`${UPSTASH}/set/user:` + email, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return res.status(200).json({ success: true });
  }

  // Сброс пароля
  if (action === 'reset-password') {
    const { email, password } = req.body;
    const checkResp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const checkData = await checkResp.json();
    if (!checkData.result) return res.status(404).json({ success: false, error: 'Аккаунт с такой почтой не найден' });

    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = JSON.parse(checkData.result);
    user.password = hash;
    await fetch(`${UPSTASH}/set/user:` + email, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    return res.status(200).json({ success: true });
  }

  // Смена имени
  if (action === 'update-name') {
    const { email, firstName, lastName } = req.body;
    const resp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const user = JSON.parse(data.result);
    user.firstName = firstName;
    user.lastName = lastName;
    user.fullName = firstName + ' ' + lastName;

    await fetch(`${UPSTASH}/set/user:` + email, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    const keysResp = await fetch(`${UPSTASH}/keys/userteam:${email}:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    if (keysData.result) {
      for (const key of keysData.result) {
        const codeResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const codeData = await codeResp.json();
        if (codeData.result) {
          const teamResp = await fetch(`${UPSTASH}/get/team:` + codeData.result, { headers: { Authorization: AUTH } });
          const teamData = await teamResp.json();
          if (teamData.result) {
            const team = JSON.parse(teamData.result);
            if (team.captain === email) {
              team.captainName = user.fullName;
              await fetch(`${UPSTASH}/set/team:` + codeData.result, {
                method: 'POST',
                headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
                body: JSON.stringify(team)
              });
            }
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      user: { firstName, lastName, fullName: user.fullName, email: user.email, phone: user.phone }
    });
  }

  // Смена телефона
  if (action === 'update-phone') {
    const { email } = req.body;
    let { phone } = req.body;
    phone = normalizePhone(phone);

    const keysResp = await fetch(`${UPSTASH}/keys/user:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    if (keysData.result) {
      for (const key of keysData.result) {
        const userResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const userData = await userResp.json();
        if (userData.result) {
          const u = JSON.parse(userData.result);
          if (normalizePhone(u.phone) === phone && u.email !== email) {
            return res.status(400).json({ success: false, error: 'Этот номер телефона уже используется' });
          }
        }
      }
    }

    const resp = await fetch(`${UPSTASH}/get/user:` + email, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const user = JSON.parse(data.result);
    user.phone = phone;

    await fetch(`${UPSTASH}/set/user:` + email, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    return res.status(200).json({ success: true, phone });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};