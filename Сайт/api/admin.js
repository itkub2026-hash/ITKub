module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';
  const ADMIN_PASSWORD = 'itcube2026';
  const { action, password } = req.body;

  // Сохранение мероприятий
  async function saveEvents(events) {
    await fetch(`${UPSTASH}/set/events`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(events)
    });
  }

  // ====== ВХОД ======
  if (action === 'login') {
    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true, token: 'admin_' + Date.now() });
    }
    return res.status(401).json({ success: false });
  }

  // ====== ПОЛУЧИТЬ ВСЕ МЕРОПРИЯТИЯ ======
  if (action === 'get-events') {
    const resp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    return res.status(200).json({ events: JSON.parse(data.result || '[]') });
  }

  // ====== СОЗДАТЬ МЕРОПРИЯТИЕ ======
  if (action === 'create-event') {
    const {
      title, date, location, description, totalPlaces,
      organizerName, organizerColor, organizerIcon, directions, cases
    } = req.body;

    const resp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const events = JSON.parse(data.result || '[]');

    const caseLimits = cases.map(c => parseInt(c.places));
    const caseFree = [...caseLimits];
    const caseTexts = cases.map(c => c.text);

    const newEvent = {
      id: Date.now(),
      title,
      date,
      location,
      description,
      freePlaces: 0,
      totalPlaces: parseInt(totalPlaces),
      caseLimits,
      caseFree,
      organizer: {
        text: organizerName,
        color: organizerColor,
        icon: organizerIcon
      },
      status: {
        text: "Регистрация открыта",
        color: "bg-emerald-500"
      },
      directions: directions.split(',').map(d => d.trim()).filter(d => d),
      cases: caseTexts
    };

    events.push(newEvent);
    await saveEvents(events);

    // Создаём счётчики
    const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const countersData = await countersResp.json();
    const counters = JSON.parse(countersData.result || '{"events":[]}');
    counters.events.push({
      id: newEvent.id,
      freePlaces: 0,
      totalPlaces: parseInt(totalPlaces),
      caseLimits,
      caseFree
    });
    await fetch(`${UPSTASH}/set/counters`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(counters)
    });

    return res.status(200).json({ success: true, event: newEvent });
  }

  // ====== РЕДАКТИРОВАТЬ МЕРОПРИЯТИЕ ======
  if (action === 'edit-event') {
    const {
      id, title, date, location, description, totalPlaces,
      organizerName, organizerColor, organizerIcon, directions, cases
    } = req.body;

    const resp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const events = JSON.parse(data.result || '[]');
    const index = events.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Мероприятие не найдено' });
    }

    const oldTitle = events[index].title;
    const caseLimits = cases.map(c => parseInt(c.places));
    const caseFree = [...caseLimits];
    const caseTexts = cases.map(c => c.text);

    events[index] = {
      ...events[index],
      title,
      date,
      location,
      description,
      totalPlaces: parseInt(totalPlaces),
      caseLimits,
      caseFree,
      organizer: {
        text: organizerName,
        color: organizerColor,
        icon: organizerIcon
      },
      directions: directions.split(',').map(d => d.trim()).filter(d => d),
      cases: caseTexts
    };

    await saveEvents(events);

    // Обновляем счётчики
    const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const countersData = await countersResp.json();
    const counters = JSON.parse(countersData.result || '{"events":[]}');
    const cIndex = counters.events.findIndex(e => e.id === id);
    if (cIndex >= 0) {
      counters.events[cIndex] = {
        ...counters.events[cIndex],
        totalPlaces: parseInt(totalPlaces),
        caseLimits,
        caseFree
      };
    }
    await fetch(`${UPSTASH}/set/counters`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(counters)
    });

    // Если название изменилось — обновляем все команды
    if (oldTitle !== title) {
      const allTeamsResp = await fetch(`${UPSTASH}/keys/team:*`, { headers: { Authorization: AUTH } });
      const allTeamsData = await allTeamsResp.json();
      if (allTeamsData.result) {
        for (const teamKey of allTeamsData.result) {
          const teamResp = await fetch(`${UPSTASH}/get/` + teamKey, { headers: { Authorization: AUTH } });
          const teamData = await teamResp.json();
          if (teamData.result) {
            try {
              const team = JSON.parse(teamData.result);
              if (team.eventTitle === oldTitle) {
                team.eventTitle = title;
                await fetch(`${UPSTASH}/set/` + teamKey, {
                  method: 'POST',
                  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
                  body: JSON.stringify(team)
                });

                // Обновляем ключи userteam для всех участников
                for (const member of team.members) {
                  const oldKey = `userteam:${member.email}:${oldTitle.replace(/\s/g, '_')}`;
                  const newKey = `userteam:${member.email}:${title.replace(/\s/g, '_')}`;
                  const oldKeyResp = await fetch(`${UPSTASH}/get/` + oldKey, { headers: { Authorization: AUTH } });
                  const oldKeyData = await oldKeyResp.json();
                  if (oldKeyData.result) {
                    await fetch(`${UPSTASH}/set/` + newKey + '/' + oldKeyData.result, { headers: { Authorization: AUTH } });
                    await fetch(`${UPSTASH}/del/` + oldKey, { headers: { Authorization: AUTH } });
                  }
                }
              }
            } catch (e) {}
          }
        }
      }
    }

    return res.status(200).json({ success: true, event: events[index] });
  }

  // ====== УДАЛИТЬ МЕРОПРИЯТИЕ ======
  if (action === 'delete-event') {
    const { id } = req.body;

    const resp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const events = JSON.parse(data.result || '[]');
    const eventToDelete = events.find(e => e.id === id);

    await saveEvents(events.filter(e => e.id !== id));

    // Удаляем счётчики
    const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const countersData = await countersResp.json();
    const counters = JSON.parse(countersData.result || '{"events":[]}');
    counters.events = counters.events.filter(e => e.id !== id);
    await fetch(`${UPSTASH}/set/counters`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(counters)
    });

    // Удаляем все команды мероприятия
    if (eventToDelete) {
      const allTeamsResp = await fetch(`${UPSTASH}/keys/team:*`, { headers: { Authorization: AUTH } });
      const allTeamsData = await allTeamsResp.json();
      if (allTeamsData.result) {
        for (const teamKey of allTeamsData.result) {
          const teamResp = await fetch(`${UPSTASH}/get/` + teamKey, { headers: { Authorization: AUTH } });
          const teamData = await teamResp.json();
          if (teamData.result) {
            try {
              const team = JSON.parse(teamData.result);
              if (team.eventTitle === eventToDelete.title) {
                // Удаляем связи userteam для всех участников
                for (const member of team.members) {
                  await fetch(`${UPSTASH}/del/userteam:${member.email}:${team.eventTitle.replace(/\s/g, '_')}`, {
                    headers: { Authorization: AUTH }
                  });
                }
                // Удаляем саму команду
                await fetch(`${UPSTASH}/del/` + teamKey, { headers: { Authorization: AUTH } });
              }
            } catch (e) {}
          }
        }
      }
    }

    return res.status(200).json({ success: true });
  }

  // ====== ПЕРЕКЛЮЧИТЬ СТАТУС МЕРОПРИЯТИЯ ======
  if (action === 'toggle-event-status') {
    const { id } = req.body;

    const resp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const events = JSON.parse(data.result || '[]');
    const index = events.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: 'Мероприятие не найдено' });
    }

    const isOpen = events[index].status?.text === 'Регистрация открыта';
    events[index].status = {
      text: isOpen ? 'Регистрация закрыта' : 'Регистрация открыта',
      color: isOpen ? 'bg-red-500' : 'bg-emerald-500'
    };

    await saveEvents(events);
    return res.status(200).json({ success: true, event: events[index] });
  }

  // ====== ПОЛУЧИТЬ ВСЕ КОМАНДЫ ======
  if (action === 'get-teams') {
    const allTeamsResp = await fetch(`${UPSTASH}/keys/team:*`, { headers: { Authorization: AUTH } });
    const allTeamsData = await allTeamsResp.json();
    const teams = [];

    if (allTeamsData.result) {
      for (const teamKey of allTeamsData.result) {
        const teamResp = await fetch(`${UPSTASH}/get/` + teamKey, { headers: { Authorization: AUTH } });
        const teamData = await teamResp.json();
        if (teamData.result) {
          try {
            const team = JSON.parse(teamData.result);
            team.inviteCode = teamKey.replace('team:', '');
            teams.push(team);
          } catch (e) {}
        }
      }
    }

    return res.status(200).json({ teams });
  }

  // ====== ПОЛУЧИТЬ СЧЁТЧИКИ ======
  if (action === 'get-counters') {
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    return res.status(200).json(JSON.parse(data.result || '{"events":[]}'));
  }

  // ====== ОБНОВИТЬ КОЛИЧЕСТВО МЕСТ ======
  if (action === 'update-total') {
    const { eventId, totalPlaces } = req.body;

    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{"events":[]}');
    const event = counters.events.find(e => e.id === eventId);

    if (event) {
      event.totalPlaces = parseInt(totalPlaces);
      await fetch(`${UPSTASH}/set/counters`, {
        method: 'POST',
        headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify(counters)
      });
    }

    return res.status(200).json({ success: true });
  }

  // ====== ОБНОВИТЬ КЕЙСЫ ======
  if (action === 'update-cases') {
    const { eventId, caseLimits } = req.body;

    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{"events":[]}');
    const event = counters.events.find(e => e.id === eventId);

    if (event) {
      event.caseLimits = caseLimits.map(c => parseInt(c));
      event.caseFree = [...event.caseLimits];
      event.freePlaces = 0;
      await fetch(`${UPSTASH}/set/counters`, {
        method: 'POST',
        headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
        body: JSON.stringify(counters)
      });
    }

    return res.status(200).json({ success: true });
  }

  // ====== СБРОСИТЬ ВСЕ СЧЁТЧИКИ ======
  if (action === 'reset-all') {
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{"events":[]}');

    for (const ev of counters.events) {
      ev.freePlaces = 0;
      ev.caseFree = [...(ev.caseLimits || [])];
    }

    await fetch(`${UPSTASH}/set/counters`, {
      method: 'POST',
      headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
      body: JSON.stringify(counters)
    });

    return res.status(200).json({ success: true });
  }

  // ====== ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ ======
  if (action === 'get-users') {
    const { search } = req.body;

    const keysResp = await fetch(`${UPSTASH}/keys/user:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    const users = [];

    if (keysData.result) {
      for (const key of keysData.result) {
        const userResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const userData = await userResp.json();
        if (userData.result) {
          const u = JSON.parse(userData.result);
          // Поиск по email или имени
          if (
            !search ||
            u.email.includes(search) ||
            (u.fullName || '').toLowerCase().includes(search.toLowerCase())
          ) {
            users.push({
              email: u.email,
              firstName: u.firstName,
              lastName: u.lastName,
              fullName: u.fullName,
              phone: u.phone
            });
          }
        }
      }
    }

    return res.status(200).json({ users });
  }

  // ====== УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ ======
  if (action === 'delete-user') {
    const { email } = req.body;

    // Находим все команды пользователя
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
            try {
              const team = JSON.parse(teamData.result);

              if (team.captain === email) {
                // Капитан — расформировываем команду
                for (const member of team.members) {
                  await fetch(`${UPSTASH}/del/userteam:${member.email}:${team.eventTitle.replace(/\s/g, '_')}`, {
                    headers: { Authorization: AUTH }
                  });
                }
                await fetch(`${UPSTASH}/del/team:` + codeData.result, { headers: { Authorization: AUTH } });

                // Обновляем счётчики
                const countersResp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
                const countersData = await countersResp.json();
                const counters = JSON.parse(countersData.result || '{"events":[]}');

                const eventsResp = await fetch(`${UPSTASH}/get/events`, { headers: { Authorization: AUTH } });
                const eventsData = await eventsResp.json();
                const allEvents = JSON.parse(eventsData.result || '[]');

                for (const ev of counters.events) {
                  const match = allEvents.find(e => e.title === team.eventTitle && e.id === ev.id);
                  if (match) {
                    ev.freePlaces = Math.max(0, (ev.freePlaces || 0) - 1);
                    if (ev.caseFree && ev.caseFree[team.caseNum - 1] !== undefined) {
                      ev.caseFree[team.caseNum - 1] = Math.min(
                        (ev.caseLimits && ev.caseLimits[team.caseNum - 1]) || 99,
                        (ev.caseFree[team.caseNum - 1] || 0) + 1
                      );
                    }
                  }
                }

                await fetch(`${UPSTASH}/set/counters`, {
                  method: 'POST',
                  headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
                  body: JSON.stringify(counters)
                });
              } else {
                // Не капитан — просто удаляем из команды
                await fetch(`${UPSTASH}/del/userteam:${email}:${team.eventTitle.replace(/\s/g, '_')}`, {
                  headers: { Authorization: AUTH }
                });

                const idx = team.members.findIndex(m => m.email === email);
                if (idx >= 0) {
                  team.members.splice(idx, 1);
                  await fetch(`${UPSTASH}/set/team:` + codeData.result, {
                    method: 'POST',
                    headers: { Authorization: AUTH, 'Content-Type': 'application/json' },
                    body: JSON.stringify(team)
                  });
                }
              }
            } catch (e) {}
          }
        }
      }
    }

    // Удаляем аккаунт
    await fetch(`${UPSTASH}/del/user:` + email, { headers: { Authorization: AUTH } });

    return res.status(200).json({ success: true });
  }

  // ====== НЕИЗВЕСТНОЕ ДЕЙСТВИЕ ======
  res.status(400).json({ error: 'Неизвестное действие' });
};