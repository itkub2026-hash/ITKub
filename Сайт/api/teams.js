module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';

  // Вспомогательная функция обновления счётчиков при выходе/исключении
  async function updateCountersOnLeave(eventTitle, caseNum) {
    try {
      const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
      const countersData = await countersResp.json();
      const counters = JSON.parse(countersData.result || '{"events":[]}');
      const respEv = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
      const dataEv = await respEv.json();
      const allEv = JSON.parse(dataEv.result || '[]');

      for (const ev of counters.events) {
        const match = allEv.find(e => e.title === eventTitle && e.id === ev.id);
        if (match) {
          ev.freePlaces = Math.max(0, (ev.freePlaces || 0) - 1);
          if (ev.caseFree && ev.caseFree[caseNum - 1] !== undefined) {
            ev.caseFree[caseNum - 1] = Math.min(
              (ev.caseLimits && ev.caseLimits[caseNum - 1]) || 99,
              (ev.caseFree[caseNum - 1] || 0) + 1
            );
          }
        }
      }

      await fetch(`${UPSTASH}/set/counters`, {
        method: 'POST',
        headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify(counters)
      });
    } catch (e) {}
  }

  // ====== GET: получить команды пользователя ======
  if (req.method === 'GET') {
    const { email } = req.query;

    const keysResp = await fetch(`${UPSTASH}/keys/userteam:${email}:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    const teams = [];

    if (keysData.result) {
      for (const key of keysData.result) {
        const codeResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const codeData = await codeResp.json();

        if (codeData.result && codeData.result !== 'null' && codeData.result !== 'undefined') {
          const teamResp = await fetch(`${UPSTASH}/get/team:` + codeData.result, { headers: { Authorization: AUTH } });
          const teamData = await teamResp.json();

          if (teamData.result) {
            try {
              teams.push({ inviteCode: codeData.result, ...JSON.parse(teamData.result) });
            } catch (e) {
              await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
            }
          } else {
            await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
          }
        } else {
          await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
        }
      }
    }

    return res.status(200).json({ teams });
  }

  // ====== POST ======
  const { action } = req.body;

  // Создать команду
  if (action === 'create') {
    const { userEmail, teamName, caseNum, eventTitle, eventDate, captainName, captainPhone, captainRole } = req.body;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let inviteCode = "";
    for (let i = 0; i < 6; i++) inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));

    const members = [{ email: userEmail, name: captainName, role: captainRole || 'Капитан' }];
    const teamData = JSON.stringify({
      teamName,
      caseNum,
      eventTitle,
      eventDate,
      inviteCode,
      captain: userEmail,
      captainName,
      captainPhone,
      members,
      date: new Date().toISOString()
    });

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: teamData
    });

    await fetch(`${UPSTASH}/set/userteam:${userEmail}:${eventTitle.replace(/\s/g, '_')}/${inviteCode}`, {
      headers: { Authorization: AUTH }
    });

    return res.status(200).json({ success: true, inviteCode });
  }

  // Вступить в команду
  if (action === 'join') {
    const { userEmail, inviteCode, userName, userPhone, userRole } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ success: false, error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    if (team.members.some(m => m.email === userEmail)) {
      return res.status(400).json({ success: false, error: 'Вы уже в команде' });
    }
    if (team.members.length >= 3) {
      return res.status(400).json({ success: false, error: 'Команда укомплектована (максимум 3 человека)' });
    }

    team.members.push({ email: userEmail, name: userName, role: userRole || 'Участник' });

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });

    await fetch(`${UPSTASH}/set/userteam:${userEmail}:${team.eventTitle.replace(/\s/g, '_')}/${inviteCode}`, {
      headers: { Authorization: AUTH }
    });

    return res.status(200).json({ success: true, team });
  }

  // Редактировать команду
  if (action === 'edit') {
    const { inviteCode, teamName, caseNum, userEmail } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    if (team.captain !== userEmail) {
      return res.status(403).json({ error: 'Только капитан может редактировать команду' });
    }

    // Проверяем, что кейс существует
    const respEv = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const dataEv = await respEv.json();
    const allEv = JSON.parse(dataEv.result || '[]');
    const ev = allEv.find(e => e.title === team.eventTitle);
    if (ev && (caseNum < 1 || caseNum > ev.cases.length)) {
      return res.status(400).json({ error: 'Такого кейса не существует' });
    }

    const oldCaseNum = team.caseNum;
    if (oldCaseNum !== caseNum && ev) {
      const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
      const countersData = await countersResp.json();
      const counters = JSON.parse(countersData.result || '{"events":[]}');
      const cEv = counters.events.find(e => e.id === ev.id);
      if (cEv && cEv.caseFree && cEv.caseFree[caseNum - 1] <= 0) {
        return res.status(400).json({ error: 'В выбранном кейсе нет свободных мест' });
      }
    }

    team.teamName = teamName;
    team.caseNum = caseNum;

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });

    return res.status(200).json({ success: true, team, oldCaseNum, newCaseNum: caseNum });
  }

  // Сменить роль
  if (action === 'change-role') {
    const { inviteCode, userEmail, role } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    const member = team.members.find(m => m.email === userEmail);
    if (!member) return res.status(400).json({ error: 'Участник не найден' });

    member.role = role;

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });

    return res.status(200).json({ success: true, team });
  }

  // Исключить участника
  if (action === 'kick') {
    const { inviteCode, userEmail, targetEmail } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    if (team.captain !== userEmail) return res.status(403).json({ error: 'Только капитан может исключать' });
    if (targetEmail === userEmail) return res.status(400).json({ error: 'Нельзя исключить самого себя' });

    team.members = team.members.filter(m => m.email !== targetEmail);

    await fetch(`${UPSTASH}/del/userteam:${targetEmail}:${team.eventTitle.replace(/\s/g, '_')}`, {
      headers: { Authorization: AUTH }
    });

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });

    // Обновляем счётчики
    await updateCountersOnLeave(team.eventTitle, team.caseNum);

    return res.status(200).json({ success: true, team });
  }

  // Выйти из команды
  if (action === 'leave') {
    const { inviteCode, userEmail } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    if (team.captain === userEmail) {
      return res.status(400).json({ error: 'Капитан не может покинуть команду. Расформируйте её.' });
    }

    team.members = team.members.filter(m => m.email !== userEmail);

    await fetch(`${UPSTASH}/del/userteam:${userEmail}:${team.eventTitle.replace(/\s/g, '_')}`, {
      headers: { Authorization: AUTH }
    });

    await fetch(`${UPSTASH}/set/team:` + inviteCode, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(team)
    });

    // Обновляем счётчики
    await updateCountersOnLeave(team.eventTitle, team.caseNum);

    return res.status(200).json({ success: true, team });
  }

  // Расформировать команду
  if (action === 'disband') {
    const { inviteCode, userEmail } = req.body;

    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ error: 'Команда не найдена' });

    const team = JSON.parse(teamData.result);
    if (team.captain !== userEmail && userEmail !== 'admin') {
      return res.status(403).json({ error: 'Только капитан может расформировать команду' });
    }

    // Удаляем связи userteam для всех участников
    for (const m of team.members) {
      await fetch(`${UPSTASH}/del/userteam:${m.email}:${team.eventTitle.replace(/\s/g, '_')}`, {
        headers: { Authorization: AUTH }
      });
    }

    // Удаляем команду
    await fetch(`${UPSTASH}/del/team:` + inviteCode, { headers: { Authorization: AUTH } });

    // Обновляем счётчики
    await updateCountersOnLeave(team.eventTitle, team.caseNum);

    return res.status(200).json({ success: true, team });
  }

  // Сохранить регистрацию
  if (action === 'save-registration') {
    const { userEmail, teamName, caseNum, eventTitle, eventDate } = req.body;
    const key = 'reg:' + userEmail + ':' + Date.now();

    await fetch(`${UPSTASH}/set/` + key, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail,
        teamName,
        caseNum,
        eventTitle,
        eventDate,
        date: new Date().toISOString()
      })
    });

    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};