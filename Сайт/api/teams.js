module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';

  // GET — получить команды пользователя
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
              // Битые данные — удаляем связь
              await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
            }
          } else {
            // Команда удалена — удаляем связь
            await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
          }
        } else {
          // Пустая связь — удаляем
          await fetch(`${UPSTASH}/del/` + key, { headers: { Authorization: AUTH } });
        }
      }
    }
    return res.status(200).json({ teams });
  }

  const { action } = req.body;

  if (action === 'create') {
    const { userEmail, teamName, caseNum, eventTitle, eventDate, captainName, captainPhone } = req.body;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let inviteCode = "";
    for (let i = 0; i < 6; i++) inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    const teamData = JSON.stringify({ teamName, caseNum, eventTitle, eventDate, inviteCode, captain: userEmail, captainName, captainPhone, members: [userEmail], date: new Date().toISOString() });

    await fetch(`${UPSTASH}/set/team:` + inviteCode, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: teamData });
    await fetch(`${UPSTASH}/set/userteam:${userEmail}:${eventTitle.replace(/\s/g, '_')}/${inviteCode}`, { headers: { Authorization: AUTH } });
    return res.status(200).json({ success: true, inviteCode });
  }

  if (action === 'join') {
    const { userEmail, inviteCode, userName, userPhone } = req.body;
    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ success: false, error: 'Команда не найдена' });
    const team = JSON.parse(teamData.result);
    if (team.members.includes(userEmail)) return res.status(400).json({ success: false, error: 'Вы уже в команде' });
    if (team.members.length >= 3) return res.status(400).json({ success: false, error: 'Команда укомплектована (макс. 3)' });
    team.members.push(userEmail);
    await fetch(`${UPSTASH}/set/team:` + inviteCode, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(team) });
    await fetch(`${UPSTASH}/set/userteam:${userEmail}:${team.eventTitle.replace(/\s/g, '_')}/${inviteCode}`, { headers: { Authorization: AUTH } });
    return res.status(200).json({ success: true, team });
  }

  if (action === 'edit') {
    const { inviteCode, teamName, caseNum, userEmail } = req.body;
    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ success: false, error: 'Команда не найдена' });
    const team = JSON.parse(teamData.result);
    if (team.captain !== userEmail) return res.status(403).json({ success: false, error: 'Только капитан может редактировать' });

    const oldCaseNum = team.caseNum;
    if (oldCaseNum !== caseNum) {
      const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
      const countersData = await countersResp.json();
      const counters = JSON.parse(countersData.result || '{"events":[]}');
      const eventNames = ['Хакатон «Цифровой Прорыв 2026»', 'IT-Cup Spring 2026', 'DevFest Ростов-на-Дону 2026'];
      const eventIndex = eventNames.indexOf(team.eventTitle);
      if (eventIndex >= 0 && counters.events && counters.events[eventIndex] && counters.events[eventIndex].caseFree && counters.events[eventIndex].caseFree[caseNum - 1] <= 0) {
        return res.status(400).json({ success: false, error: 'В выбранном кейсе нет свободных мест' });
      }
    }

    team.teamName = teamName;
    team.caseNum = caseNum;
    await fetch(`${UPSTASH}/set/team:` + inviteCode, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(team) });
    return res.status(200).json({ success: true, team, oldCaseNum, newCaseNum: caseNum });
  }

  if (action === 'disband') {
    const { inviteCode, userEmail } = req.body;
    const teamResp = await fetch(`${UPSTASH}/get/team:` + inviteCode, { headers: { Authorization: AUTH } });
    const teamData = await teamResp.json();
    if (!teamData.result) return res.status(404).json({ success: false, error: 'Команда не найдена' });
    const team = JSON.parse(teamData.result);
    if (team.captain !== userEmail) return res.status(403).json({ success: false, error: 'Только капитан может расформировать' });

    // Удаляем связи ВСЕХ участников
    for (const member of team.members) {
      await fetch(`${UPSTASH}/del/userteam:${member}:${team.eventTitle.replace(/\s/g, '_')}`, { headers: { Authorization: AUTH } });
    }
    await fetch(`${UPSTASH}/del/team:` + inviteCode, { headers: { Authorization: AUTH } });
    return res.status(200).json({ success: true, team });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};