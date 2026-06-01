// ============================================================
// НАСТРОЙКИ
// ============================================================
const VERCEL_URL = 'https://itcube-2fa.vercel.app';

// ============================================================
// ТОСТЫ
// ============================================================
function showToast(message, isError = false) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.backgroundColor = isError ? '#ef4444' : '#1f2937';
  toast.style.borderLeft = `4px solid ${isError ? '#b91c1c' : '#4f46e5'}`;
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.color = 'white';
  toast.style.zIndex = '1100';
  toast.style.animation = 'slideIn 0.3s ease';
  toast.style.fontSize = '14px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toast.innerHTML = `<i class="fas ${isError ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i> ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============================================================
// ТЕЛЕФОН
// ============================================================
function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '8') return '7' + digits.slice(1);
  if (digits.length === 11 && digits[0] === '7') return digits;
  return digits;
}

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (!digits.startsWith('7') && !digits.startsWith('8')) return false;
  return true;
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
let currentUser = null;
let isLoggingIn = false;

async function checkSession() {
  const saved = localStorage.getItem('itcube_user');
  if (saved) {
    currentUser = JSON.parse(saved);
    try {
      const resp = await fetch(`${VERCEL_URL}/api/user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-email', email: currentUser.email })
      });
      const data = await resp.json();
      if (!data.exists) {
        currentUser = null;
        localStorage.removeItem('itcube_user');
        updateUserUI();
        showToast('Ваш аккаунт был удалён', true);
        return;
      }
    } catch (e) {}
    updateUserUI();
  }
}

function updateUserUI() {
  const userArea = document.getElementById('user-area');
  const navRegs = document.getElementById('nav-registrations');
  if (currentUser) {
    const first = currentUser.firstName || currentUser.fullName?.split(' ')[0] || '';
    const last = currentUser.lastName || currentUser.fullName?.split(' ')[1] || '';
    const initials = (first[0] || '') + (last[0] || first[0] || '');
    userArea.innerHTML = `
      <button onclick="showCabinet()" class="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-2xl transition">
        <div class="w-8 h-8 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">${initials || '?'}</div>
        <span class="text-sm">${first || 'Профиль'}</span>
      </button>
    `;
    navRegs.classList.remove('hidden');
  } else {
    userArea.innerHTML = `
      <button onclick="showAuthModal()" class="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-2xl transition">
        <i class="fas fa-user text-purple-400"></i>
        <span class="text-sm">Войти</span>
      </button>
    `;
    navRegs.classList.add('hidden');
  }
}

function showAuthModal() { document.getElementById('auth-modal-overlay').classList.remove('hidden'); showLogin(); }
function closeAuthModalOutside(e) { if (e.target.id === 'auth-modal-overlay') { document.getElementById('auth-modal-overlay').classList.add('hidden'); } }
function closeCabinetModalOutside(e) { if (e.target.id === 'cabinet-modal-overlay') { document.getElementById('cabinet-modal-overlay').classList.add('hidden'); history.back(); } }
function closeTeamsModalOutside(e) { if (e.target.id === 'teams-modal-overlay') { document.getElementById('teams-modal-overlay').classList.add('hidden'); } }

function hideAllAuth() {
  ['auth-login','auth-register','auth-verify','auth-forgot'].forEach(id => document.getElementById(id).classList.add('hidden'));
  ['login-error','register-error','verify-error','forgot-error'].forEach(id => document.getElementById(id).classList.add('hidden'));
}

function showLogin() { hideAllAuth(); document.getElementById('auth-login').classList.remove('hidden'); }
function showRegister() { hideAllAuth(); document.getElementById('auth-register').classList.remove('hidden'); }
function showForgotPassword() { hideAllAuth(); document.getElementById('auth-forgot').classList.remove('hidden'); document.getElementById('forgot-verify').classList.add('hidden'); }

let pendingRegData = null;
let isRegistering = false;

async function register() {
  if (isRegistering) return;
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName = document.getElementById('reg-lastname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  let phone = normalizePhone(document.getElementById('reg-phone').value.trim());
  const password = document.getElementById('reg-password').value;
  const errEl = document.getElementById('register-error');
  
  if (!firstName) { errEl.textContent = 'Введите имя'; errEl.classList.remove('hidden'); return; }
  if (!lastName) { errEl.textContent = 'Введите фамилию'; errEl.classList.remove('hidden'); return; }
  if (!email) { errEl.textContent = 'Введите email'; errEl.classList.remove('hidden'); return; }
  if (!phone) { errEl.textContent = 'Введите телефон'; errEl.classList.remove('hidden'); return; }
  if (!validatePhone(phone)) { errEl.textContent = 'Некорректный номер'; errEl.classList.remove('hidden'); return; }
  if (!password || password.length < 6) { errEl.textContent = 'Пароль минимум 6 символов'; errEl.classList.remove('hidden'); return; }

  errEl.classList.add('hidden');
  isRegistering = true;
  
  const regBtn = document.getElementById('reg-btn');
  if (regBtn) { regBtn.disabled = true; regBtn.textContent = 'Проверка...'; }

  const checkResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-email', email })
  });
  const checkData = await checkResp.json();
  if (checkData.exists) {
    errEl.textContent = 'Аккаунт с такой почтой уже существует';
    errEl.classList.remove('hidden');
    isRegistering = false;
    if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Зарегистрироваться'; }
    return;
  }

  const phoneCheckResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-phone', phone })
  });
  const phoneCheckData = await phoneCheckResp.json();
  if (phoneCheckData.exists) {
    errEl.textContent = 'Этот номер телефона уже зарегистрирован';
    errEl.classList.remove('hidden');
    isRegistering = false;
    if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Зарегистрироваться'; }
    return;
  }

  if (regBtn) { regBtn.textContent = 'Отправка...'; }

  pendingRegData = { firstName, lastName, fullName: firstName + ' ' + lastName, email, phone, password };
  hideAllAuth();
  document.getElementById('auth-verify').classList.remove('hidden');

  const response = await fetch(`${VERCEL_URL}/api/send-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
  });
  const data = await response.json();
  if (!data.success) {
    hideAllAuth(); document.getElementById('auth-register').classList.remove('hidden');
    showToast('Ошибка отправки кода', true); isRegistering = false;
    if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Зарегистрироваться'; }
    return;
  }
  showToast('Код отправлен на ' + email);
}

async function confirmRegistration() {
  const code = document.getElementById('verify-code').value.toUpperCase().trim();
  const errEl = document.getElementById('verify-error');
  if (!code) { errEl.textContent = 'Введите код'; errEl.classList.remove('hidden'); return; }

  const response = await fetch(`${VERCEL_URL}/api/verify-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: pendingRegData.email, code })
  });
  const data = await response.json();
  if (!data.success) { errEl.textContent = 'Неверный код'; errEl.classList.remove('hidden'); return; }

  const regResponse = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'register', ...pendingRegData })
  });
  const regData = await regResponse.json();
  
  if (!regData.success) {
    hideAllAuth();
    document.getElementById('auth-register').classList.remove('hidden');
    const errEl2 = document.getElementById('register-error');
    errEl2.textContent = regData.error || 'Ошибка регистрации';
    errEl2.classList.remove('hidden');
    isRegistering = false;
    const regBtn = document.getElementById('reg-btn');
    if (regBtn) { regBtn.disabled = false; regBtn.textContent = 'Зарегистрироваться'; }
    return;
  }

  currentUser = { firstName: pendingRegData.firstName, lastName: pendingRegData.lastName, fullName: pendingRegData.fullName, email: pendingRegData.email, phone: pendingRegData.phone };
  localStorage.setItem('itcube_user', JSON.stringify(currentUser));
  document.getElementById('auth-modal-overlay').classList.add('hidden');
  updateUserUI();
  showToast('Регистрация успешна!');
  pendingRegData = null; isRegistering = false;
}

async function login() {
  if (isLoggingIn) return;
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  if (!email || !password) { errEl.textContent = 'Заполните все поля'; errEl.classList.remove('hidden'); return; }

  isLoggingIn = true;
  const response = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', email, password })
  });
  const data = await response.json();
  isLoggingIn = false;

  if (!data.success) { errEl.textContent = 'Неверный email или пароль'; errEl.classList.remove('hidden'); return; }

  currentUser = data.user;
  localStorage.setItem('itcube_user', JSON.stringify(currentUser));
  document.getElementById('auth-modal-overlay').classList.add('hidden');
  updateUserUI();
  showToast('Вход выполнен!');
}

async function sendForgotPasswordCode() {
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  if (!email) { errEl.textContent = 'Введите email'; errEl.classList.remove('hidden'); return; }

  const checkResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-email', email })
  });
  const checkData = await checkResp.json();
  if (!checkData.exists) {
    errEl.textContent = 'Аккаунт с такой почтой не найден';
    errEl.classList.remove('hidden');
    return;
  }

  const response = await fetch(`${VERCEL_URL}/api/send-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  const data = await response.json();
  if (!data.success) { errEl.textContent = 'Ошибка отправки'; errEl.classList.remove('hidden'); return; }
  errEl.classList.add('hidden'); document.getElementById('forgot-verify').classList.remove('hidden');
  showToast('Код отправлен на ' + email);
}

async function resetPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const code = document.getElementById('forgot-code').value.toUpperCase().trim();
  const newPassword = document.getElementById('forgot-new-password').value;
  const errEl = document.getElementById('forgot-error');
  if (!code) { errEl.textContent = 'Введите код'; errEl.classList.remove('hidden'); return; }
  if (!newPassword || newPassword.length < 6) { errEl.textContent = 'Пароль минимум 6 символов'; errEl.classList.remove('hidden'); return; }
  const vResp = await fetch(`${VERCEL_URL}/api/verify-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, code }) });
  const vData = await vResp.json();
  if (!vData.success) { errEl.textContent = 'Неверный код'; errEl.classList.remove('hidden'); return; }
  await fetch(`${VERCEL_URL}/api/user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset-password', email, password: newPassword }) });
  showToast('Пароль изменён!');
  showLogin();
}

// Личный кабинет
function showCabinet() {
  const first = currentUser.firstName || currentUser.fullName?.split(' ')[0] || '';
  const last = currentUser.lastName || currentUser.fullName?.split(' ')[1] || '';
  document.getElementById('cabinet-avatar').textContent = (first[0] || '') + (last[0] || first[0] || '');
  document.getElementById('cabinet-name').textContent = currentUser.fullName || (first + ' ' + last);
  document.getElementById('cabinet-email').textContent = currentUser.email;
  document.getElementById('cabinet-phone').textContent = currentUser.phone;
  document.getElementById('cabinet-modal-overlay').classList.remove('hidden');
  document.getElementById('change-name-block').classList.add('hidden');
  document.getElementById('change-email-block').classList.add('hidden');
  document.getElementById('change-password-block').classList.add('hidden');
  document.getElementById('change-phone-block').classList.add('hidden');
  history.pushState({ page: 'cabinet' }, '', '#cabinet');
}

function showChangeName() {
  const block = document.getElementById('change-name-block');
  block.classList.toggle('hidden');
  if (!block.classList.contains('hidden')) {
    document.getElementById('change-firstname').value = currentUser.firstName || currentUser.fullName?.split(' ')[0] || '';
    document.getElementById('change-lastname').value = currentUser.lastName || currentUser.fullName?.split(' ')[1] || '';
  }
}

async function saveNewName() {
  const firstName = document.getElementById('change-firstname').value.trim();
  const lastName = document.getElementById('change-lastname').value.trim();
  if (!firstName || !lastName) return showToast('Заполните имя и фамилию', true);

  if (firstName === (currentUser.firstName || currentUser.fullName?.split(' ')[0] || '') &&
      lastName === (currentUser.lastName || currentUser.fullName?.split(' ')[1] || '')) {
    showToast('Это имя и фамилия уже используются', true);
    return;
  }

  const response = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update-name', email: currentUser.email, firstName, lastName })
  });
  const data = await response.json();
  if (data.success) {
    currentUser = data.user;
    localStorage.setItem('itcube_user', JSON.stringify(currentUser));
    showCabinet(); updateUserUI();
    showToast('Имя обновлено!');
  }
}

function showChangeEmail() {
  document.getElementById('change-email-block').classList.remove('hidden');
  document.getElementById('change-email-verify').classList.add('hidden');
  document.getElementById('new-email').value = '';
  document.getElementById('change-email-code').value = '';
}

async function sendChangeEmailCode() {
  const newEmail = document.getElementById('new-email').value.trim();
  if (!newEmail) return showToast('Введите новый email', true);

  const checkResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'check-email', email: newEmail })
  });
  const checkData = await checkResp.json();
  if (checkData.exists) {
    showToast('Эта почта уже используется', true);
    return;
  }

  const response = await fetch(`${VERCEL_URL}/api/send-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail })
  });
  const data = await response.json();
  if (data.success) {
    document.getElementById('change-email-verify').classList.remove('hidden');
    showToast('Код отправлен на ' + newEmail);
  }
}

async function confirmChangeEmail() {
  const newEmail = document.getElementById('new-email').value.trim();
  const code = document.getElementById('change-email-code').value.toUpperCase().trim();

  const response = await fetch(`${VERCEL_URL}/api/verify-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail, code })
  });
  const data = await response.json();
  if (!data.success) return showToast('Неверный код', true);

  const updateResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update-email', oldEmail: currentUser.email, newEmail })
  });
  const updateData = await updateResp.json();
  if (!updateData.success) {
    showToast(updateData.error || 'Ошибка смены почты', true);
    return;
  }

  currentUser.email = newEmail;
  localStorage.setItem('itcube_user', JSON.stringify(currentUser));
  showCabinet();
  showToast('Email обновлён!');
}

function showChangePassword() {
  document.getElementById('change-password-block').classList.toggle('hidden');
  document.getElementById('change-password-verify').classList.add('hidden');
  document.getElementById('new-password').value = '';
  document.getElementById('change-password-code').value = '';
}

async function sendChangePasswordCode() {
  const newPassword = document.getElementById('new-password').value;

  if (!newPassword || newPassword.length < 6) {
    showToast('Пароль минимум 6 символов', true);
    return;
  }

  const checkResp = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', email: currentUser.email, password: newPassword })
  });
  const checkData = await checkResp.json();
  if (checkData.success) {
    showToast('Этот пароль уже используется', true);
    return;
  }

  const response = await fetch(`${VERCEL_URL}/api/send-code`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: currentUser.email })
  });
  const data = await response.json();
  if (data.success) {
    document.getElementById('change-password-verify').classList.remove('hidden');
    showToast('Код отправлен на ' + currentUser.email);
  }
}

async function confirmChangePassword() {
  const newPassword = document.getElementById('new-password').value;
  const code = document.getElementById('change-password-code').value.toUpperCase().trim();
  if (!newPassword || newPassword.length < 6) return showToast('Пароль минимум 6 символов', true);
  const response = await fetch(`${VERCEL_URL}/api/verify-code`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: currentUser.email, code }) });
  const data = await response.json();
  if (!data.success) return showToast('Неверный код', true);
  await fetch(`${VERCEL_URL}/api/user`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-password', email: currentUser.email, password: newPassword }) });
  showToast('Пароль обновлён!');
  document.getElementById('change-password-block').classList.add('hidden');
}

function showChangePhone() {
  document.getElementById('change-phone-block').classList.toggle('hidden');
  if (!document.getElementById('change-phone-block').classList.contains('hidden')) {
    document.getElementById('change-phone').value = currentUser.phone || '';
  }
}

async function saveNewPhone() {
  let phone = normalizePhone(document.getElementById('change-phone').value.trim());
  if (!phone) return showToast('Введите номер телефона', true);
  if (!validatePhone(phone)) return showToast('Некорректный номер', true);
  if (phone === normalizePhone(currentUser.phone)) {
    showToast('Этот номер уже используется', true);
    return;
  }

  const response = await fetch(`${VERCEL_URL}/api/user`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update-phone', email: currentUser.email, phone })
  });
  const data = await response.json();
  if (data.success) {
    currentUser.phone = data.phone;
    localStorage.setItem('itcube_user', JSON.stringify(currentUser));
    showCabinet();
    showToast('Номер обновлён!');
  } else {
    showToast(data.error || 'Ошибка', true);
  }
}

// Регистрации и команды
async function showMyTeams() {
  document.getElementById('teams-modal-overlay').classList.remove('hidden');
  document.getElementById('join-team-block').classList.add('hidden');
  const list = document.getElementById('teams-list');
  list.innerHTML = '<p class="text-gray-400 text-center">Загрузка...</p>';

  const response = await fetch(`${VERCEL_URL}/api/teams?email=${encodeURIComponent(currentUser.email)}`);
  const data = await response.json();

  if (!data.teams || data.teams.length === 0) {
    list.innerHTML = '<p class="text-gray-400 text-center">У вас пока нет регистраций</p>';
    return;
  }

  list.innerHTML = data.teams.map(t => `
    <div class="bg-gray-800 rounded-2xl p-4">
      <div class="flex justify-between items-start">
        <div>
          <p class="text-white font-semibold">${t.eventTitle}</p>
          <p class="text-gray-400 text-sm">Команда: ${t.teamName} • Кейс №${t.caseNum}</p>
          <p class="text-gray-400 text-sm">Капитан: ${t.captainName}</p>
          <p class="text-gray-500 text-xs">Код: <span class="text-purple-400 font-mono">${t.inviteCode}</span> • Участников: ${t.members.length}/3</p>
          <div class="text-gray-500 text-xs mt-1">Участники: ${t.members.join(', ')}</div>
        </div>
        ${t.captain === currentUser.email ? `
        <div class="flex flex-col gap-2">
          <button onclick="editTeam('${t.inviteCode}')" class="text-purple-400 hover:text-purple-300 text-sm"><i class="fas fa-pen"></i></button>
          <button onclick="disbandTeam('${t.inviteCode}')" class="text-red-400 hover:text-red-300 text-sm"><i class="fas fa-trash"></i></button>
        </div>
        ` : ''}
      </div>
    </div>
  `).join('');
}

function showJoinTeam() {
  document.getElementById('join-team-block').classList.remove('hidden');
  document.getElementById('join-invite-code').value = '';
  document.getElementById('join-error').classList.add('hidden');
}

async function joinTeam() {
  const code = document.getElementById('join-invite-code').value.toUpperCase().trim();
  const errEl = document.getElementById('join-error');
  if (!code) { errEl.textContent = 'Введите код приглашения'; errEl.classList.remove('hidden'); return; }

  const response = await fetch(`${VERCEL_URL}/api/teams`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'join', userEmail: currentUser.email, inviteCode: code, userName: currentUser.fullName, userPhone: currentUser.phone })
  });
  const data = await response.json();
  if (!data.success) { errEl.textContent = data.error || 'Ошибка'; errEl.classList.remove('hidden'); return; }

  showToast('Вы вступили в команду!');
  showMyTeams();
}

async function editTeam(inviteCode) {
  document.getElementById('teams-modal-overlay').classList.add('hidden');
  
  const response = await fetch(`${VERCEL_URL}/api/teams?email=${encodeURIComponent(currentUser.email)}`);
  const data = await response.json();
  const team = data.teams?.find(t => t.inviteCode === inviteCode);
  if (!team) return;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'edit-team-overlay';
  overlay.onclick = function(e) { if (e.target.id === 'edit-team-overlay') overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal-content p-8" style="max-width: 450px;" onclick="event.stopPropagation()">
      <h3 class="text-2xl font-bold mb-6 text-center">Редактирование команды</h3>
      <p class="text-gray-400 text-sm mb-2">Название команды</p>
      <input type="text" id="edit-team-name" value="${team.teamName}" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 mb-4">
      <p class="text-gray-400 text-sm mb-2">Номер кейса (текущий: ${team.caseNum})</p>
      <input type="text" id="edit-case-num" placeholder="1-4" inputmode="numeric" maxlength="1" value="${team.caseNum}" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 mb-6">
      <div class="flex gap-3">
        <button onclick="document.getElementById('edit-team-overlay').remove(); showMyTeams();" class="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-2xl transition">Отмена</button>
        <button onclick="saveTeamChanges('${inviteCode}')" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 py-4 rounded-2xl transition font-semibold">Сохранить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

async function saveTeamChanges(inviteCode) {
  const teamName = document.getElementById('edit-team-name').value.trim();
  const caseNum = parseInt(document.getElementById('edit-case-num').value);
  if (!teamName) return showToast('Введите название команды', true);
  if (!caseNum || isNaN(caseNum) || caseNum < 1 || caseNum > 4) return showToast('Номер кейса от 1 до 4', true);

  const respTeams = await fetch(`${VERCEL_URL}/api/teams?email=${encodeURIComponent(currentUser.email)}`);
  const dataTeams = await respTeams.json();
  const team = dataTeams.teams?.find(t => t.inviteCode === inviteCode);
  if (team && team.caseNum !== caseNum) {
    const event = events.find(e => e.title === team.eventTitle);
    if (event && event.caseFree[caseNum - 1] <= 0) {
      showFieldError('edit-case-num', 'В этом кейсе нет свободных мест');
      return;
    }
  }

  const response = await fetch(`${VERCEL_URL}/api/teams`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'edit', inviteCode, teamName, caseNum, userEmail: currentUser.email })
  });
  const data = await response.json();
  if (data.success) {
    if (data.oldCaseNum && data.oldCaseNum !== data.newCaseNum) {
      const event = events.find(e => e.title === data.team.eventTitle);
      if (event) {
        event.caseFree[data.oldCaseNum - 1]++;
        event.caseFree[data.newCaseNum - 1]--;
        await saveCounters();
        renderEvents();
        if (currentEvent && currentEvent.title === data.team.eventTitle) {
          currentEvent.caseFree = [...event.caseFree];
          renderDetailPage();
        }
      }
    }
    document.getElementById('edit-team-overlay').remove();
    showToast('Команда обновлена!');
    showMyTeams();
  } else {
    showToast(data.error || 'Ошибка', true);
  }
}

async function disbandTeam(inviteCode) {
  if (!confirm('Вы уверены, что хотите расформировать команду? Это действие нельзя отменить.')) return;

  const respTeams = await fetch(`${VERCEL_URL}/api/teams?email=${encodeURIComponent(currentUser.email)}`);
  const dataTeams = await respTeams.json();
  const team = dataTeams.teams?.find(t => t.inviteCode === inviteCode);

  const response = await fetch(`${VERCEL_URL}/api/teams`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'disband', inviteCode, userEmail: currentUser.email })
  });
  const data = await response.json();
  if (data.success) {
    if (team) {
      const event = events.find(e => e.title === team.eventTitle);
      if (event) {
        event.freePlaces = Math.max(0, event.freePlaces - 1);
        event.caseFree[team.caseNum - 1] = Math.min(
          event.caseLimits[team.caseNum - 1],
          event.caseFree[team.caseNum - 1] + 1
        );
        await saveCounters();
        renderEvents();
        if (currentEvent && currentEvent.title === team.eventTitle) {
          currentEvent.freePlaces = event.freePlaces;
          currentEvent.caseFree = [...event.caseFree];
          renderDetailPage();
        }
      }
    }
    showToast('Команда расформирована');
    showMyTeams();
  } else {
    showToast(data.error || 'Ошибка', true);
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('itcube_user');
  document.getElementById('cabinet-modal-overlay').classList.add('hidden');
  document.getElementById('teams-modal-overlay').classList.add('hidden');
  updateUserUI();
  showToast('Вы вышли');
  history.pushState({ page: 'home' }, '', '#');
}

function scrollToEvents() {
  backToHome();
  setTimeout(() => {
    document.getElementById('events-grid')?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ============================================================
// СЧЁТЧИКИ (Upstash)
// ============================================================
async function loadCounters() {
  try {
    const resp = await fetch(`${VERCEL_URL}/api/counters`);
    const data = await resp.json();
    if (data && data.events) {
      for (const saved of data.events) {
        const event = events.find(e => e.id === saved.id);
        if (event) {
          event.freePlaces = saved.freePlaces ?? event.freePlaces;
          event.caseFree = saved.caseFree ?? event.caseFree;
          if (saved.totalPlaces) event.totalPlaces = saved.totalPlaces;
          if (saved.caseLimits) event.caseLimits = saved.caseLimits;
        }
      }
    }
  } catch (e) {
    console.error('Ошибка загрузки счётчиков:', e);
  }
}

async function saveCounters() {
  const data = {
    events: events.map(e => ({
      id: e.id,
      freePlaces: e.freePlaces,
      totalPlaces: e.totalPlaces,
      caseFree: e.caseFree,
      caseLimits: e.caseLimits
    }))
  };
  try {
    await fetch(`${VERCEL_URL}/api/counters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.error('Ошибка сохранения счётчиков:', e);
  }
}

// ============================================================
// ДАННЫЕ МЕРОПРИЯТИЙ
// ============================================================
let events = [
  {
    id: 1,
    title: "Хакатон «Цифровой Прорыв 2026»",
    date: "15 июня 2026",
    location: "Москва, Цифровое пространство",
    description: "Меня приветствует Центр-инвест — один из крупнейших банков России. Это масштабный банковский хакатон, посвящённый цифровой трансформации финансовых услуг. Участники будут решать реальные задачи банка, работая с актуальными данными и технологиями. Мероприятие пройдёт в очном формате в Москве. Лучшие команды получат денежные призы, возможность стажировки и дальнейшего трудоустройства в Центр-инвест.",
    freePlaces: 0,
    totalPlaces: 120,
    caseLimits: [30, 30, 30, 30],
    caseFree: [30, 30, 30, 30],
    organizer: { text: "Центр-инвест", color: "bg-emerald-500", icon: "🏦" },
    status: { text: "Регистрация открыта", color: "bg-emerald-500" },
    directions: ["Web-разработка", "ИИ", "Мобильные приложения", "Финтех", "Data Science"],
    cases: [
      "Разработка мобильного банковского приложения нового поколения с ИИ",
      "Система автоматической оценки кредитных рисков с использованием машинного обучения",
      "Цифровой финансовый помощник (интеллектуальный чат-бот) для клиентов",
      "Платформа для персонализированных инвестиционных рекомендаций"
    ]
  },
  {
    id: 2,
    title: "IT-Cup Spring 2026",
    date: "22 июня 2026",
    location: "Онлайн",
    description: "IT-КУБ проводит межвузовский кейс-чемпионат для студентов и молодых IT-специалистов. Это одно из самых ожидаемых онлайн-соревнований весны. Участники смогут продемонстрировать навыки программирования, командной работы и решения реальных задач. Мероприятие полностью онлайн, что позволяет участвовать командам со всей России.",
    freePlaces: 0,
    totalPlaces: 60,
    caseLimits: [15, 15, 15, 15],
    caseFree: [15, 15, 15, 15],
    organizer: { text: "IT-КУБ", color: "bg-purple-600", icon: "💻" },
    status: { text: "Регистрация открыта", color: "bg-emerald-500" },
    directions: ["Backend", "Frontend", "Fullstack", "Аналитика", "Мобильная разработка"],
    cases: [
      "Разработка веб-платформы для управления студенческими проектами",
      "Создание системы рекомендаций курсов и карьерного роста студентов",
      "Мобильное приложение для мониторинга успеваемости и расписания",
      "Автоматизация процесса распределения студентов на производственную практику"
    ]
  },
  {
    id: 3,
    title: "DevFest Ростов-на-Дону 2026",
    date: "5 июля 2026",
    location: "Ростов-на-Дону, РГЭУ (РИНХ)",
    description: "РГЭУ (РИНХ) приглашает на DevFest Ростов-на-Дону 2026 — крупнейший IT-фестиваль Юга России. В программе: технические доклады от экспертов, мастер-классы, networking-зона, соревнования и решение реальных задач университета. Мероприятие пройдёт в кампусе университета.",
    freePlaces: 0,
    totalPlaces: 40,
    caseLimits: [10, 10, 10, 10],
    caseFree: [10, 10, 10, 10],
    organizer: { text: "РГЭУ (РИНХ)", color: "bg-orange-500", icon: "🎓" },
    status: { text: "Регистрация открыта", color: "bg-emerald-500" },
    directions: ["Backend", "Frontend", "Mobile Development", "DevOps", "Cybersecurity"],
    cases: [
      "Разработка высоконагруженного веб-сервиса для университета",
      "Создание системы умного кампуса (IoT-решения)",
      "Защита данных и информационная безопасность университетской инфраструктуры",
      "Автоматизация процессов приёмной кампании и документооборота"
    ]
  }
];

// ============================================================
// ВАЛИДАЦИЯ
// ============================================================
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  input.classList.add('input-error');
  let err = document.getElementById(`error-${inputId}`);
  if (!err) {
    err = document.createElement('div');
    err.id = `error-${inputId}`;
    err.className = 'error-message';
    input.parentNode.insertBefore(err, input.nextSibling);
  }
  err.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(`error-${inputId}`);
  input.classList.remove('input-error');
  if (err) err.remove();
}

async function sendCodeToEmail(email) {
  try {
    const r = await fetch(`${VERCEL_URL}/api/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const d = await r.json();
    if (d.success) { showToast(`Код отправлен на ${email}`); return true; }
    else { showToast(`Ошибка: ${d.error}`, true); return false; }
  } catch {
    showToast('Сервер недоступен', true);
    return false;
  }
}

// ============================================================
// МОДАЛКИ
// ============================================================
let pendingConfirmCallback = null;

function showCodeModal(onConfirm) {
  pendingConfirmCallback = onConfirm;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'code-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content p-8">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-envelope text-white text-2xl"></i>
        </div>
        <h3 class="text-2xl font-bold mb-2">Подтверждение регистрации</h3>
        <p class="text-gray-400 text-sm">Введите код из письма</p>
      </div>
      <input type="text" id="modal-code-input" placeholder="Код" maxlength="5" autocomplete="off" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-center text-lg tracking-wider mb-4" style="text-transform: uppercase;">
      <div class="flex gap-3">
        <button id="modal-cancel-btn" class="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl transition">Отмена</button>
        <button id="modal-submit-btn" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 py-3 rounded-xl transition font-semibold">Подтвердить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('modal-cancel-btn').addEventListener('click', function() {
    overlay.remove();
    pendingConfirmCallback = null;
    const submitBtn = document.querySelector('#reg-form button[type="submit"]');
    if (submitBtn && submitBtn.textContent === 'Отправка...') {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Зарегистрировать команду';
    }
  });

  document.getElementById('modal-submit-btn').addEventListener('click', async function() {
    const input = document.getElementById('modal-code-input');
    const userCode = input ? input.value.toUpperCase().trim() : '';
    if (!userCode) return;

    const email = currentUser?.email;
    if (!email) return;

    const response = await fetch(`${VERCEL_URL}/api/verify-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: userCode })
    });
    const data = await response.json();

    if (!data.success) {
      if (input) {
        input.classList.add('border-red-500');
        let err = document.getElementById('modal-error');
        if (!err) {
          err = document.createElement('div');
          err.id = 'modal-error';
          err.className = 'text-red-400 text-sm text-center mt-2';
          err.innerHTML = '<i class="fas fa-exclamation-circle"></i> Неверный код!';
          input.parentNode.insertBefore(err, input.nextSibling);
        }
        setTimeout(() => { input.classList.remove('border-red-500'); }, 500);
      }
      return;
    }

    overlay.remove();
    if (pendingConfirmCallback) {
      pendingConfirmCallback();
      pendingConfirmCallback = null;
    }
  });

  setTimeout(() => {
    const input = document.getElementById('modal-code-input');
    if (input) {
      input.focus();
      input.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    }
  }, 100);
}

function showSuccessModal(onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'success-modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content p-8 text-center">
      <div class="text-center mb-6">
        <div class="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-check-circle text-white text-3xl"></i>
        </div>
        <h3 class="text-2xl font-bold mb-2 text-emerald-400">Регистрация подтверждена!</h3>
        <p class="text-gray-300 text-sm">Команда успешно зарегистрирована</p>
      </div>
      <button id="success-close-btn" class="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 py-3 rounded-xl transition font-semibold mt-4">
        Закрыть
      </button>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('success-close-btn').addEventListener('click', function() {
    overlay.remove();
    if (onClose) onClose();
  });
}

// ============================================================
// ОТОБРАЖЕНИЕ МЕРОПРИЯТИЙ
// ============================================================
function updateEventUI(event) {
  const isFull = event.freePlaces >= event.totalPlaces;
  event.status.text = isFull ? "Регистрация закрыта" : "Регистрация открыта";
  event.status.color = isFull ? "bg-red-500" : "bg-emerald-500";
}

function renderEvents() {
  const container = document.getElementById('events-grid');
  if (!container) return;
  container.innerHTML = '';
  events.forEach(event => {
    updateEventUI(event);
    const isClosed = event.freePlaces >= event.totalPlaces;
    const card = document.createElement('div');
    card.className = 'bg-gray-900 rounded-3xl overflow-hidden cursor-pointer card-hover';
    card.innerHTML = `
      <div class="h-52 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center relative">
        <span class="text-7xl">${event.organizer.icon}</span>
        <div class="absolute top-4 left-4 ${event.organizer.color} text-white text-xs px-4 py-1.5 rounded-full">
          ${event.organizer.icon} ${event.organizer.text}
        </div>
        <div class="absolute top-4 right-4 ${event.status.color} text-white text-xs px-4 py-1.5 rounded-full">
          ${event.status.text}
        </div>
      </div>
      <div class="p-6">
        <h3 class="font-semibold text-xl mb-2">${event.title}</h3>
        <p class="text-gray-400 text-sm mb-4">${event.date} • ${event.location}</p>
        <p class="text-sm line-clamp-3 mb-6">${event.description}</p>
        <div class="flex justify-between items-center">
          <div class="${isClosed ? 'text-red-400' : 'text-emerald-400'} font-medium">
            ${event.freePlaces} / ${event.totalPlaces} мест
          </div>
          <button onclick="showEventDetail(${event.id}); event.stopImmediatePropagation()" class="bg-purple-600 hover:bg-purple-700 px-6 py-2.5 rounded-2xl text-sm font-medium">
            Подробнее
          </button>
        </div>
      </div>
    `;
    card.onclick = () => showEventDetail(event.id);
    container.appendChild(card);
  });
}

// ============================================================
// НАВИГАЦИЯ
// ============================================================
window.addEventListener('popstate', function(event) {
  if (event.state && event.state.page === 'detail') {
    showEventDetail(event.state.eventId);
  } else if (event.state && event.state.page === 'cabinet') {
    // Модалка уже открыта
  } else {
    document.getElementById('cabinet-modal-overlay').classList.add('hidden');
    document.getElementById('teams-modal-overlay').classList.add('hidden');
    document.getElementById('auth-modal-overlay').classList.add('hidden');
    backToHome();
  }
});

let currentEvent = null;

function showEventDetail(id) {
  currentEvent = events.find(e => e.id === id);
  if (!currentEvent) return;
  history.pushState({ page: 'detail', eventId: id }, '', '#event-' + id);
  document.getElementById('home').classList.add('hidden');
  document.getElementById('event-detail').classList.remove('hidden');
  renderDetailPage();
}

function renderDetailPage() {
  if (!currentEvent) return;
  const event = currentEvent;
  updateEventUI(event);
  const isClosed = event.freePlaces >= event.totalPlaces;
  
  document.getElementById('event-detail-content').innerHTML = `
    <div class="p-8 md:p-12">
      <div class="flex gap-3 mb-6">
        <div class="${event.organizer.color} text-white text-sm px-5 py-2 rounded-full">
          ${event.organizer.icon} ${event.organizer.text}
        </div>
        <div class="${event.status.color} text-white text-sm px-5 py-2 rounded-full">
          ${event.status.text}
        </div>
      </div>
      <h1 class="text-4xl font-bold mb-4">${event.title}</h1>
      <p class="text-gray-400 text-lg">${event.date} • ${event.location}</p>
      <div class="bg-gray-800 border border-gray-700 px-8 py-6 rounded-3xl my-10 flex justify-center items-center gap-3 text-2xl">
        <span id="detail-free-places" class="${isClosed ? 'text-red-400' : 'text-emerald-400'}">${event.freePlaces}</span>
        <span class="text-gray-400">из ${event.totalPlaces} мест</span>
      </div>
      <div>
        <h3 class="text-xl font-semibold mb-4">О мероприятии</h3>
        <p class="text-gray-300 leading-relaxed">${event.description}</p>
      </div>
      <div class="mt-12">
        <h3 class="text-xl font-semibold mb-6">Направления участия</h3>
        <div class="flex flex-wrap gap-3">
          ${event.directions.map(d => `<span class="bg-gray-800 text-gray-300 px-5 py-3 rounded-2xl text-sm">${d}</span>`).join('')}
        </div>
      </div>
      <h3 class="text-xl font-semibold mb-4 mt-12">Кейсы</h3>
      <ol class="space-y-3 list-decimal pl-5">
        ${event.cases.map((c, i) => {
          const taken = event.caseLimits[i] - event.caseFree[i];
          const left = event.caseFree[i];
          return `<li class="text-gray-300">${c} <span class="${left <= 0 ? 'text-red-400' : 'text-emerald-400'} text-sm">(занято ${taken} из ${event.caseLimits[i]}, осталось ${left})</span></li>`;
        }).join('')}
      </ol>
      <div class="mt-16 bg-gray-800 rounded-3xl p-10">
        <h3 class="text-2xl font-semibold mb-8 text-center">Регистрация команды</h3>
        <form id="reg-form" class="space-y-6 max-w-lg mx-auto" novalidate>
          <div>
            <input type="text" id="team-name" placeholder="Название команды" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4">
          </div>
          <div>
            <input type="text" id="case-number" placeholder="Номер кейса" inputmode="numeric" maxlength="1" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4">
          </div>
          <button type="submit" ${isClosed ? 'disabled' : ''} class="w-full ${isClosed ? 'bg-red-600/80 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105'} py-5 rounded-3xl text-lg font-semibold transition">
            ${isClosed ? 'Регистрация закрыта' : 'Зарегистрировать команду'}
          </button>
        </form>
      </div>
    </div>
  `;
  
  const form = document.getElementById('reg-form');
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    
    ['team-name', 'case-number'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener('input', () => clearFieldError(id));
    });
    
    newForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      const submitBtn = newForm.querySelector('button[type="submit"]');
      
      if (!currentUser) {
        showToast('Войдите в аккаунт', true);
        return;
      }
      if (!currentUser.email) {
        showToast('Ошибка профиля. Войдите заново.', true);
        return;
      }
      if (isClosed) {
        showToast("Регистрация закрыта", true);
        return;
      }
      
      const teamName = document.getElementById('team-name').value.trim();
      const caseNum = parseInt(document.getElementById('case-number').value);
      let isValid = true;
      
      if (!teamName) { showFieldError('team-name', 'Введите название'); isValid = false; }
      else clearFieldError('team-name');
      
      if (!caseNum || isNaN(caseNum) || caseNum < 1 || caseNum > 4) {
        showFieldError('case-number', 'Номер кейса 1-4'); isValid = false;
      } else if (currentEvent.caseFree[caseNum - 1] <= 0) {
        showFieldError('case-number', 'Места закончились'); isValid = false;
      } else clearFieldError('case-number');
      
      if (!isValid) return;
      
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';
      }
      
      const checkResp = await fetch(`${VERCEL_URL}/api/teams?email=${encodeURIComponent(currentUser.email)}`);
      const checkData = await checkResp.json();
      if (checkData.teams?.some(t => t.eventTitle === currentEvent.title)) {
        showToast('У вас уже есть команда на это мероприятие', true);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Зарегистрировать команду';
        }
        return;
      }
      
      showCodeModal(async function() {
        try {
          const createResp = await fetch(`${VERCEL_URL}/api/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'create',
              userEmail: currentUser.email,
              teamName,
              caseNum,
              eventTitle: currentEvent.title,
              eventDate: currentEvent.date,
              captainName: currentUser.fullName,
              captainPhone: currentUser.phone
            })
          });
          const createData = await createResp.json();
          
          if (!createData.success) {
            showToast('Ошибка создания команды', true);
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Зарегистрировать команду';
            }
            return;
          }
          
          if (currentEvent.freePlaces < currentEvent.totalPlaces) {
            currentEvent.freePlaces++;
            currentEvent.caseFree[caseNum - 1]--;
          }
          const ge = events.find(e => e.id === currentEvent.id);
          if (ge) {
            ge.freePlaces = currentEvent.freePlaces;
            ge.caseFree = [...currentEvent.caseFree];
          }
          
          saveCounters();
          updateEventUI(currentEvent);
          
          const ps = document.getElementById('detail-free-places');
          if (ps) {
            ps.textContent = currentEvent.freePlaces;
            ps.className = currentEvent.freePlaces >= currentEvent.totalPlaces ? 'text-red-400' : 'text-emerald-400';
          }
          
          if (submitBtn) {
            submitBtn.disabled = false;
            if (currentEvent.freePlaces >= currentEvent.totalPlaces) {
              submitBtn.className = 'w-full bg-red-600/80 cursor-not-allowed py-5 rounded-3xl text-lg font-semibold';
              submitBtn.textContent = 'Регистрация закрыта';
              submitBtn.disabled = true;
            } else {
              submitBtn.className = 'w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 py-5 rounded-3xl text-lg font-semibold transition';
              submitBtn.textContent = 'Зарегистрировать команду';
            }
          }
          
          const statusBadge = document.querySelector('#event-detail-content .bg-emerald-500, #event-detail-content .bg-red-500');
          if (statusBadge && currentEvent.freePlaces >= currentEvent.totalPlaces) {
            statusBadge.classList.remove('bg-emerald-500');
            statusBadge.classList.add('bg-red-500');
            statusBadge.textContent = 'Регистрация закрыта';
          }
          
          renderEvents();
          showSuccessModal(function() {});
        } catch (err) {
          console.error('Ошибка:', err);
          showToast('Ошибка сервера', true);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Зарегистрировать команду';
          }
        }
      });
      
      sendCodeToEmail(currentUser.email);
    });
  }
}

function backToHome() {
  history.pushState({ page: 'home' }, '', '#');
  document.getElementById('event-detail').classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
  currentEvent = null;
  renderEvents();
}

// ============================================================
// ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
  await checkSession();
  await loadCounters();
  renderEvents();
});