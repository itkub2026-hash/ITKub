// ИНИЦИАЛИЗАЦИЯ EMAILJS
emailjs.init("ZJAxGm6oxlmWKh3Z_");

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

let events = [
  {
    id: 1,
    title: "Хакатон «Цифровой Прорыв 2026»",
    date: "15 июня 2026",
    location: "Москва, Цифровое пространство",
    description: "Меня приветствует Центр-инвест — один из крупнейших банков России. Это масштабный банковский хакатон, посвящённый цифровой трансформации финансовых услуг. Участники будут решать реальные задачи банка, работая с актуальными данными и технологиями. Мероприятие пройдёт в очном формате в Москве. Лучшие команды получат денежные призы, возможность стажировки и дальнейшего трудоустройства в Центр-инвест.",
    freePlaces: 0,
    totalPlaces: 120,
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
    freePlaces: 59,
    totalPlaces: 60,
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
    organizer: { text: "РГЭУ (РИНХ)", color: "bg-orange-500", icon: "🎓" },
    status: { text: "Регистрация закрыта", color: "bg-red-500" },
    directions: ["Backend", "Frontend", "Mobile Development", "DevOps", "Cybersecurity"],
    cases: [
      "Разработка высоконагруженного веб-сервиса для университета",
      "Создание системы умного кампуса (IoT-решения)",
      "Защита данных и информационная безопасность университетской инфраструктуры",
      "Автоматизация процессов приёмной кампании и документооборота"
    ]
  }
];

function validatePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (!digits.startsWith('7') && !digits.startsWith('8')) return false;
  return true;
}

function isValidEmail(email) {
  if (!email) return false;
  if (!email.includes('@')) return false;
  const afterAt = email.split('@')[1];
  if (!afterAt || !afterAt.includes('.')) return false;
  return true;
}

function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const existingError = document.getElementById(`error-${inputId}`);
  input.classList.add('input-error');
  if (existingError) {
    existingError.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
  } else {
    const errorDiv = document.createElement('div');
    errorDiv.id = `error-${inputId}`;
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    input.parentNode.insertBefore(errorDiv, input.nextSibling);
  }
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(`error-${inputId}`);
  input.classList.remove('input-error');
  if (error) error.remove();
}

let pendingConfirmCallback = null;

function showCodeModal(inviteCode, onConfirm) {
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
      <input type="text" id="modal-code-input" placeholder="Код из письма" maxlength="5" autocomplete="off" class="w-full bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 text-center text-lg tracking-wider mb-4 focus:border-purple-500 focus:outline-none" style="text-transform: uppercase;">
      <div class="flex gap-3">
        <button onclick="window.closeCodeModal()" class="flex-1 bg-gray-700 hover:bg-gray-600 py-3 rounded-xl transition">Отмена</button>
        <button onclick="window.submitCode('${inviteCode}')" class="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 py-3 rounded-xl transition font-semibold">Подтвердить</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    const input = document.getElementById('modal-code-input');
    if (input) {
      input.focus();
      input.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
      });
    }
  }, 100);
}

window.closeCodeModal = function() {
  const overlay = document.getElementById('code-modal-overlay');
  if (overlay) overlay.remove();
  pendingConfirmCallback = null;
};

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
        <p class="text-gray-300 text-sm">Команда успешно зарегистрирована на мероприятие</p>
      </div>
      <button onclick="window.closeSuccessModal()" class="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 py-3 rounded-xl transition font-semibold mt-4">
        Закрыть
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  window.successCallback = onClose;
}

window.closeSuccessModal = function() {
  const overlay = document.getElementById('success-modal-overlay');
  if (overlay) overlay.remove();
  if (window.successCallback) {
    window.successCallback();
    window.successCallback = null;
  }
};

window.submitCode = function(inviteCode) {
  const input = document.getElementById('modal-code-input');
  const userCode = input ? input.value.toUpperCase().trim() : '';
  
  if (userCode !== inviteCode) {
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
      setTimeout(() => {
        input.classList.remove('border-red-500');
        input.style.borderColor = '';
      }, 500);
    }
    return;
  }
  
  window.closeCodeModal();
  
  showSuccessModal(function() {
    if (pendingConfirmCallback) {
      pendingConfirmCallback();
      pendingConfirmCallback = null;
    }
  });
};

// ОТПРАВКА ПИСЬМА ЧЕРЕЗ EMAILJS (ИСПРАВЛЕНО)
async function sendCodeToEmail(email, code, teamName, eventTitle) {
  try {
    const templateParams = {
      event_title: eventTitle,
      team_name: teamName,
      invite_code: code
    };
    
    console.log("Отправка письма на:", email);
    console.log("Параметры шаблона:", templateParams);
    
    const response = await emailjs.send(
      "service_5rxtegf",
      "template_w1eqcj4",
      templateParams,
      email  // Email получателя (4-й параметр)
    );
    
    console.log("Ответ EmailJS:", response);
    
    if (response.status === 200) {
      showToast(`Код отправлен на ${email}`);
      return true;
    } else {
      showToast(`Ошибка отправки: ${response.text}`, true);
      return false;
    }
  } catch (error) {
    console.error('Ошибка EmailJS:', error);
    showToast(`Ошибка: ${error.text || error.message}`, true);
    return false;
  }
}

function updateEventUI(event) {
  if (event.id === 3) {
    event.status.text = "Регистрация закрыта";
    event.status.color = "bg-red-500";
    return;
  }
  const isFull = event.freePlaces >= event.totalPlaces;
  if (isFull && event.status.text !== "Регистрация закрыта") {
    event.status.text = "Регистрация закрыта";
    event.status.color = "bg-red-500";
  } else if (!isFull && event.status.text !== "Регистрация открыта") {
    event.status.text = "Регистрация открыта";
    event.status.color = "bg-emerald-500";
  }
}

function renderEvents() {
  const container = document.getElementById('events-grid');
  if (!container) return;
  container.innerHTML = '';
  events.forEach(event => {
    updateEventUI(event);
    const isClosed = (event.freePlaces >= event.totalPlaces) || event.id === 3;
    const placesColor = isClosed ? "text-red-400" : "text-emerald-400";
    const card = document.createElement('div');
    card.className = `bg-gray-900 rounded-3xl overflow-hidden cursor-pointer card-hover`;
    card.innerHTML = `
      <div class="h-52 bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center relative">
        <span class="text-7xl">${event.organizer.icon}</span>
        <div class="absolute top-4 left-4 ${event.organizer.color} text-white text-xs px-4 py-1.5 rounded-full font-medium flex items-center gap-1.5">${event.organizer.icon} ${event.organizer.text}</div>
        <div class="absolute top-4 right-4 ${event.status.color} text-white text-xs px-4 py-1.5 rounded-full font-medium">${event.status.text}</div>
      </div>
      <div class="p-6">
        <h3 class="font-semibold text-xl mb-2">${event.title}</h3>
        <p class="text-gray-400 text-sm mb-4">${event.date} • ${event.location}</p>
        <p class="text-sm line-clamp-3 mb-6">${event.description}</p>
        <div class="flex justify-between items-center">
          <div class="${placesColor} font-medium">${event.freePlaces} / ${event.totalPlaces} мест</div>
          <button onclick="showEventDetail(${event.id}); event.stopImmediatePropagation()" class="bg-purple-600 hover:bg-purple-700 px-6 py-2.5 rounded-2xl text-sm font-medium">Подробнее</button>
        </div>
      </div>
    `;
    card.onclick = () => showEventDetail(event.id);
    container.appendChild(card);
  });
}

let currentEvent = null;

function showEventDetail(id) {
  currentEvent = events.find(e => e.id === id);
  if (!currentEvent) return;
  document.getElementById('home').classList.add('hidden');
  document.getElementById('event-detail').classList.remove('hidden');
  renderDetailPage();
}

function renderDetailPage() {
  if (!currentEvent) return;
  const event = currentEvent;
  updateEventUI(event);
  
  const isClosed = (event.freePlaces >= event.totalPlaces) || event.id === 3;
  
  let directionsHTML = event.directions.map(dir => `<span class="bg-gray-800 text-gray-300 px-5 py-3 rounded-2xl text-sm">${dir}</span>`).join('');
  let casesHTML = `<h3 class="text-xl font-semibold mb-4 mt-12">Кейсы</h3><ol class="space-y-3 list-decimal pl-5">${event.cases.map(c => `<li class="text-gray-300">${c}</li>`).join('')}</ol>`;
  document.getElementById('event-detail-content').innerHTML = `
    <div class="p-8 md:p-12">
      <div class="flex gap-3 mb-6">
        <div class="${event.organizer.color} text-white text-sm px-5 py-2 rounded-full font-medium flex items-center gap-2"><span>${event.organizer.icon}</span> ${event.organizer.text}</div>
        <div class="${event.status.color} text-white text-sm px-5 py-2 rounded-full font-medium">${event.status.text}</div>
      </div>
      <h1 class="text-4xl font-bold mb-4">${event.title}</h1>
      <p class="text-gray-400 text-lg">${event.date} • ${event.location}</p>
      <div class="bg-gray-800 border border-gray-700 px-8 py-6 rounded-3xl my-10 flex justify-center items-center gap-3 text-2xl font-medium">
        <span id="detail-free-places" class="${isClosed ? 'text-red-400' : 'text-emerald-400'}">${event.freePlaces}</span>
        <span class="text-gray-400">из ${event.totalPlaces} мест</span>
      </div>
      <div><h3 class="text-xl font-semibold mb-4">О мероприятии</h3><p class="text-gray-300 leading-relaxed">${event.description}</p></div>
      <div class="mt-12"><h3 class="text-xl font-semibold mb-6">Направления участия</h3><div class="flex flex-wrap gap-3">${directionsHTML}</div></div>
      ${casesHTML}
      <div class="mt-16 bg-gray-800 rounded-3xl p-10">
        <h3 class="text-2xl font-semibold mb-8 text-center">Регистрация команды</h3>
        <form id="reg-form" class="space-y-6 max-w-lg mx-auto">
          <div><input type="text" id="team-name" placeholder="Название команды" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4"></div>
          <div><input type="text" id="captain-name" placeholder="ФИО капитана" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4"></div>
          <div><input type="text" id="email" placeholder="Email" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4"></div>
          <div><input type="tel" id="phone" placeholder="Телефон" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4"></div>
          <div><input type="number" id="case-number" placeholder="Номер кейса" class="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-4"></div>
          <button type="submit" ${isClosed ? 'disabled' : ''} class="w-full ${isClosed ? 'bg-red-600/80 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105'} py-5 rounded-3xl text-lg font-semibold transition">${isClosed ? 'Регистрация закрыта' : 'Зарегистрировать команду'}</button>
        </form>
      </div>
    </div>
  `;
  
  const form = document.getElementById('reg-form');
  if (form) {
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);
    ['team-name', 'captain-name', 'email', 'phone', 'case-number'].forEach(id => {
      const input = document.getElementById(id);
      if (input) input.addEventListener('input', () => clearFieldError(id));
    });
    
    newForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (isClosed) {
        showToast("Регистрация на это мероприятие закрыта", true);
        return;
      }
      
      const teamName = document.getElementById('team-name').value.trim();
      const captainName = document.getElementById('captain-name').value.trim();
      const email = document.getElementById('email').value.trim();
      const phoneRaw = document.getElementById('phone').value.trim();
      const caseNum = document.getElementById('case-number').value;
      let isValid = true;
      
      if (!teamName) { showFieldError('team-name', 'Введите название команды'); isValid = false; } else { clearFieldError('team-name'); }
      if (!captainName) { showFieldError('captain-name', 'Введите ФИО капитана'); isValid = false; } else { clearFieldError('captain-name'); }
      if (!email) { showFieldError('email', 'Введите email'); isValid = false; } else if (!isValidEmail(email)) { showFieldError('email', 'Некорректный email'); isValid = false; } else { clearFieldError('email'); }
      if (!phoneRaw) { showFieldError('phone', 'Введите номер телефона'); isValid = false; } else if (!validatePhone(phoneRaw)) { showFieldError('phone', 'Некорректный номер'); isValid = false; } else { clearFieldError('phone'); }
      if (!caseNum) { showFieldError('case-number', 'Введите номер кейса'); isValid = false; } else if (caseNum < 1 || caseNum > 4) { showFieldError('case-number', 'Такого кейса нет'); isValid = false; } else { clearFieldError('case-number'); }
      
      if (!isValid) return;
      
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let inviteCode = "";
      for (let i = 0; i < 5; i++) inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
      
      const teamNameSaved = teamName;
      const caseNumSaved = caseNum;
      
      const emailSent = await sendCodeToEmail(email, inviteCode, teamNameSaved, currentEvent.title);
      if (!emailSent) return;
      
      const updateCounter = function() {
        if (currentEvent.id !== 3 && currentEvent.freePlaces < currentEvent.totalPlaces) {
          currentEvent.freePlaces++;
        }
        
        const globalEvent = events.find(e => e.id === currentEvent.id);
        if (globalEvent) {
          globalEvent.freePlaces = currentEvent.freePlaces;
        }
        
        updateEventUI(currentEvent);
        
        const placesSpan = document.getElementById('detail-free-places');
        if (placesSpan) {
          placesSpan.textContent = currentEvent.freePlaces;
          const newIsClosed = (currentEvent.freePlaces >= currentEvent.totalPlaces) || currentEvent.id === 3;
          placesSpan.className = newIsClosed ? 'text-red-400' : 'text-emerald-400';
        }
        
        const submitBtn = document.querySelector('#reg-form button[type="submit"]');
        if (submitBtn && ((currentEvent.freePlaces >= currentEvent.totalPlaces) || currentEvent.id === 3)) {
          submitBtn.disabled = true;
          submitBtn.classList.remove('bg-gradient-to-r', 'from-purple-600', 'to-indigo-600', 'hover:scale-105');
          submitBtn.classList.add('bg-red-600/80', 'cursor-not-allowed');
          submitBtn.textContent = 'Регистрация закрыта';
        }
        
        const statusBadge = document.querySelector('#event-detail-content .bg-emerald-500, #event-detail-content .bg-red-500');
        if (statusBadge && ((currentEvent.freePlaces >= currentEvent.totalPlaces) || currentEvent.id === 3)) {
          statusBadge.classList.remove('bg-emerald-500');
          statusBadge.classList.add('bg-red-500');
          statusBadge.textContent = 'Регистрация закрыта';
        }
        
        renderEvents();
      };
      
      showCodeModal(inviteCode, updateCounter);
    });
  }
}

function backToHome() {
  document.getElementById('event-detail').classList.add('hidden');
  document.getElementById('home').classList.remove('hidden');
  currentEvent = null;
  renderEvents();
}

document.addEventListener('DOMContentLoaded', function() {
  renderEvents();
});
