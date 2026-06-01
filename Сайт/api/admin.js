module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const UPSTASH = 'https://apparent-leech-40158.upstash.io';
  const AUTH = 'Bearer AZzeAAIgcDE2NjRiMWNjNmM3NTY0YjAxODE1NmZhNDM5MmVmZmRkOQ';
  const ADMIN_PASSWORD = 'itcube2026';

  const { action, password } = req.body;

  if (action === 'login') {
    if (password === ADMIN_PASSWORD) return res.status(200).json({ success: true, token: 'admin_' + Date.now() });
    return res.status(401).json({ success: false });
  }

  if (action === 'get-counters') {
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    return res.status(200).json(JSON.parse(data.result || '{"events":[]}'));
  }

  if (action === 'update-total') {
    const { eventId, totalPlaces } = req.body;
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{"events":[]}');
    const event = counters.events.find(e => e.id === eventId);
    if (event) { event.totalPlaces = totalPlaces; await fetch(`${UPSTASH}/set/counters`, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(counters) }); }
    return res.status(200).json({ success: true });
  }

  if (action === 'update-cases') {
    const { eventId, caseLimits } = req.body;
    const resp = await fetch(`${UPSTASH}/get/counters`, { headers: { Authorization: AUTH } });
    const data = await resp.json();
    const counters = JSON.parse(data.result || '{"events":[]}');
    const event = counters.events.find(e => e.id === eventId);
    if (event) { event.caseLimits = caseLimits; event.caseFree = [...caseLimits]; event.freePlaces = 0; await fetch(`${UPSTASH}/set/counters`, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(counters) }); }
    return res.status(200).json({ success: true });
  }

  if (action === 'reset-all') {
    const fresh = { events: [{ id: 1, freePlaces: 0, totalPlaces: 120, caseLimits: [30,30,30,30], caseFree: [30,30,30,30] },{ id: 2, freePlaces: 0, totalPlaces: 60, caseLimits: [15,15,15,15], caseFree: [15,15,15,15] },{ id: 3, freePlaces: 0, totalPlaces: 40, caseLimits: [10,10,10,10], caseFree: [10,10,10,10] }] };
    await fetch(`${UPSTASH}/set/counters`, { method: 'POST', headers: { Authorization: AUTH, 'Content-Type': 'application/json' }, body: JSON.stringify(fresh) });
    return res.status(200).json({ success: true });
  }

  if (action === 'get-users') {
    const keysResp = await fetch(`${UPSTASH}/keys/user:*`, { headers: { Authorization: AUTH } });
    const keysData = await keysResp.json();
    const users = [];
    if (keysData.result) {
      for (const key of keysData.result) {
        const userResp = await fetch(`${UPSTASH}/get/` + key, { headers: { Authorization: AUTH } });
        const userData = await userResp.json();
        if (userData.result) {
          const u = JSON.parse(userData.result);
          users.push({ email: u.email, firstName: u.firstName, lastName: u.lastName, fullName: u.fullName, phone: u.phone });
        }
      }
    }
    return res.status(200).json({ users });
  }

  if (action === 'delete-user') {
    const { email } = req.body;
    await fetch(`${UPSTASH}/del/user:` + email, { headers: { Authorization: AUTH } });
    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};