const tg = window.Telegram?.WebApp;
if (tg) tg.expand();

// Константы
const CONFIG = {
  BET_AMOUNTS: [10, 25, 50, 100, 150, 200],
  JACKPOT_CHANCE: 0.02,
  MIN_DEPOSIT: 50,
  STAR_PRICE: 1.45,
  CARD_LINK: {
    API_URL: "https://cardlink.example.com/api",
    MERCHANT_ID: "YOUR_MERCHANT_ID"
  },
  SUPABASE: {
    URL: 'https://zgbyfwvpntzlmmqenzrq.supabase.co',
    KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYnlmd3ZwbnR6bG1tcWVuenJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTE3MDIsImV4cCI6MjA2NTk4NzcwMn0.beVeqEQilmUMBCkl4lus8EFa2aDPmczgc2kqtJT62Ok'
  }
};

let supabase;
try {
  supabase = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.KEY);
  console.log('Supabase инициализирован');
} catch (error) {
  console.error('Ошибка инициализации Supabase:', error);
  renderErrorScreen('Ошибка подключения к базе данных');
}


let supabaseClient = null;

const state = {
  user: {
    id: null,
    stars: 500,
    nickname: 'Гость'
  },
  games: [
    { id: 1, name: "COMETA SLOTS", icon: "🎰" },
    { id: 2, name: "COSMIC COMET", icon: "☄️" },
    { id: 3, name: "CYBER DICE", icon: "🎯" },
    { id: 4, name: "COMET MASTERS", icon: "🚀" }
  ],
  slots: {
    currentWin: 0,
    isSpinning: false,
    betAmount: 100,
    reels: ["💎", "💎", "💎"],
    jackpot: 25000
  }
};

// DOM элементы
const app = document.getElementById('app');

// Функции работы с пользователем
async function saveUserData() {
  if (!userData.userId) return;
  
  const { error } = await supabase
    .from('users')
    .upsert({
      id: userData.userId,
      stars: userData.stars,
      nickname: userData.nickname,
      last_seen: new Date().toISOString()
    });
  
  if (error) console.error('Save error:', error);
}

async function loadUserData(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return await createUser(userId);
    }
    return data;
  } catch (error) {
    console.error('Ошибка загрузки пользователя:', error);
    return null;
  }
}
async function createUser(userId) {
  try {
    const newUser = {
      id: userId,
      stars: 5000,
      nickname: tg.initDataUnsafe.user?.first_name || 'Гость',
      last_seen: new Date().toISOString()
    };

    const { error } = await supabase
      .from('users')
      .insert([newUser]);

    if (error) throw error;
    return newUser;
  } catch (error) {
    console.error('Ошибка создания пользователя:', error);
    return null;
  }
}
async function updateUserStars(userId, amount) {
  try {
    const newBalance = state.user.stars + amount;
    const { error } = await supabase
      .from('users')
      .update({ stars: newBalance })
      .eq('id', userId);

    if (error) throw error;
    state.user.stars = newBalance;
    return true;
  } catch (error) {
    console.error('Ошибка обновления баланса:', error);
    return false;
  }
}

function initSupabase() {
  try {
    supabaseClient = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_KEY);
    console.log("Supabase инициализирован");
    return true;
  } catch (error) {
    console.error("Ошибка инициализации Supabase:", error);
    return false;
  }
}

async function createNewUser(userId) {
  const newUser = {
    id: userId,
    stars: 5000,
    nickname: tg.initDataUnsafe.user?.first_name || 'Гость',
    last_seen: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('users')
    .insert([newUser]);

  if (error) {
    console.error('Ошибка создания:', error);
    return null;
  }
  return newUser;
}

async function updateUserData(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId);

  if (error) console.error('Ошибка обновления:', error);
  return data;
}

// Основные функции приложения
async function initApp() {
  // Проверяем инициализацию Telegram WebApp
  if (!tg?.initDataUnsafe?.user?.id) {
    renderErrorScreen("Требуется авторизация в Telegram");
    return;
  }

  // Инициализируем Supabase
  if (!initSupabase()) {
    renderErrorScreen("Ошибка подключения к базе данных");
    return;
  }

  // Загружаем данные пользователя
  try {
    const userId = tg.initDataUnsafe.user.id.toString();
    const { data, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      // Создаем нового пользователя
      const newUser = {
        id: userId,
        stars: 5000,
        nickname: tg.initDataUnsafe.user?.first_name || 'Гость',
        last_seen: new Date().toISOString()
      };

      const { error: createError } = await supabaseClient
        .from('users')
        .insert([newUser]);

      if (createError) throw createError;

      AppState.userData = { ...AppState.userData, ...newUser };
    } else {
      AppState.userData = { ...AppState.userData, ...data };
    }

    renderMainScreen();
  } catch (error) {
    console.error("Ошибка инициализации:", error);
    renderErrorScreen("Ошибка загрузки данных");
  }
}

function renderErrorScreen(message) {
  const app = document.getElementById('app') || document.body;
  app.innerHTML = `
    <div class="error-screen">
      <h2>Ошибка</h2>
      <p>${message}</p>
      <button onclick="location.reload()">Попробовать снова</button>
    </div>
  `;
}


// Функции пополнения баланса
function renderDepositScreen() {
  app.innerHTML = `
    <div class="header">
      <button onclick="renderMainScreen()">← Назад</button>
      <div class="balance">⭐ ${userData.stars}</div>
    </div>
    
    <div class="deposit-container">
      <h2 class="neon-text">Пополнение баланса</h2>
      <div class="rate-info">1 ⭐ = ${STAR_PRICE} ₽</div>
      
      <div class="deposit-options">
        <button onclick="quickDeposit(50)">50⭐ (75₽)</button>
        <button onclick="quickDeposit(100)">100⭐ (145₽)</button>
        <button onclick="quickDeposit(200)">200⭐ (290₽)</button>
      </div>
      
      <div class="custom-deposit">
        <h3>Свое количество</h3>
        <div class="input-group">
          <input type="number" id="depositAmount" placeholder="От ${MIN_DEPOSIT}⭐" min="${MIN_DEPOSIT}">
          <button onclick="processCustomDeposit()">OK</button>
        </div>
        <div class="min-deposit">Минимум ${MIN_DEPOSIT}⭐</div>
      </div>
    </div>
  `;
}

function quickDeposit(amount) {
  const rubles = (amount * STAR_PRICE).toFixed(2);
  tg.showConfirm(`Купить ${amount}⭐ за ${rubles}₽?`, (confirmed) => {
    if (confirmed) {
      createCardlinkPayment(amount, rubles)
        .then(paymentUrl => {
          tg.openLink(paymentUrl);
          tg.showAlert(`Платеж создан. После подтверждения баланс пополнится на ${amount}⭐`);
          tg.HapticFeedback.notificationOccurred('success');
        })
        .catch(error => {
          tg.showAlert("Ошибка при создании платежа: " + error);
          tg.HapticFeedback.notificationOccurred('error');
        });
    }
  });
}

function createCardlinkPayment(amount, rubles) {
  return new Promise((resolve) => {
    const paymentData = {
      merchant_id: CARD_LINK_MERCHANT_ID,
      amount: rubles,
      currency: "RUB",
      order_id: generateOrderId(),
      description: `Пополнение баланса на ${amount} звезд`,
      success_url: "https://yourdomain.com/success",
      fail_url: "https://yourdomain.com/fail",
      callback_url: "https://yourdomain.com/callback"
    };

    setTimeout(() => {
      resolve("https://cardlink.example.com/pay?token=demo_token");
    }, 500);
  });
}

function generateOrderId() {
  return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

function processCustomDeposit() {
  const input = document.getElementById('depositAmount');
  const amount = parseInt(input.value);
  
  if (!input.value.trim() || isNaN(amount)) {
    tg.showAlert("Введите число");
    input.focus();
    return;
  }
  
  if (amount < MIN_DEPOSIT) {
    tg.showAlert(`Минимальное пополнение ${MIN_DEPOSIT}⭐`);
    input.focus();
    return;
  }
  
  quickDeposit(amount);
  input.value = '';
}

// Основные экраны
function renderMainScreen() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="header">
      <h1>Comet Of Luck</h1>
      <div class="balance">⭐ ${state.user.stars}</div>
    </div>
    <div class="main-menu">
      ${state.games.map(game => `
        <div class="game-card" onclick="renderGame(${game.id})">
          <div class="game-icon">${game.icon}</div>
          <div class="game-name">${game.name}</div>
        </div>
      `).join('')}
    </div>
  `;
}

// Игра в слоты
function renderSlots() {
  app.innerHTML = `
    <div class="header">
      <button onclick="renderMainScreen()">← Назад</button>
      <div class="balance">⭐ ${userData.stars}</div>
    </div>
    <div class="game-container">
      <div class="slots-header">
        <h2>Comet-Slots</h2>
        <div class="jackpot">Джекпот: ${jackpot} ⭐</div>
      </div>
      
      <div class="slots-machine">
        <div class="slots-reels-container">
          <div class="slots-reels">
            ${[0, 1, 2].map(index => `
              <div class="reel-frame ${slotsReels[0] === slotsReels[1] && slotsReels[1] === slotsReels[2] ? 'win' : ''}">
                <div class="reel-glass"></div>
                <div class="reel-container">
                  <div class="reel" id="reel-${index}">
                    <div class="symbol-container">
                      <div class="symbol ${!isSpinning && slotsReels[index] === "☠️" ? 'skull' : ''}">
                        ${isSpinning ? slotSymbols[Math.floor(Math.random() * slotSymbols.length)] : slotsReels[index]}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      
      <div class="bet-display">
        <div class="current-bet">Ставка: ${slotBetAmount} ⭐</div>
        <div class="current-win">Выигрыш: ${currentWinAmount} ⭐</div>
      </div>
      
      <div class="slots-controls">
        <button class="toggle-bet-button" onclick="toggleBetSelection()" ${isSpinning ? 'disabled' : ''}>
          ${showBetSelection ? '▲ Скрыть ставки ▲' : '▼ Выбрать ставку ▼'}
        </button>
        
        ${showBetSelection ? `
        <div class="bet-selection">
          <div class="bet-arrows">
            <button class="bet-arrow" onclick="changeSlotBet(-1)" ${isSpinning || slotBetAmount <= BET_AMOUNTS[0] ? 'disabled' : ''}>
              ←
            </button>
            <div class="bet-amount">${slotBetAmount} ⭐</div>
            <button class="bet-arrow" onclick="changeSlotBet(1)" ${isSpinning || slotBetAmount >= BET_AMOUNTS[BET_AMOUNTS.length - 1] || BET_AMOUNTS[BET_AMOUNTS.indexOf(slotBetAmount) + 1] > userData.stars ? 'disabled' : ''}>
              →
            </button>
          </div>
          <div class="bet-quick-buttons">
            ${BET_AMOUNTS.map(amount => `
              <button 
                onclick="slotBetAmount = ${amount}; renderSlots();" 
                class="${amount === slotBetAmount ? 'active' : ''}" 
                ${isSpinning || amount > userData.stars ? 'disabled' : ''}
              >
                ${amount}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <button class="spin-button" onclick="startSpin()" ${isSpinning || userData.stars < slotBetAmount ? 'disabled' : ''}>
          ${isSpinning ? 'КРУТИТСЯ...' : 'КРУТИТЬ'}
        </button>
      </div>
      
      <div class="slots-paytable">
        <h3>Выигрыши:</h3>
        <ul>
          <li>3 одинаковых = x10</li>
          <li>2 одинаковых = x2</li>
          <li>7️⃣7️⃣7️⃣ = Джекпот</li>
        </ul>
      </div>
    </div>
  `;

  if (isSpinning) {
    startSpinAnimations();
  }
}

function startSpinAnimations() {
  clearAllSpinIntervals();
  
  const targetReels = [...slotsReels];
  let animationsCompleted = 0;
  
  [0, 1, 2].forEach((reelIndex, i) => {
    const reelElement = document.getElementById(`reel-${reelIndex}`);
    const symbolElement = reelElement.querySelector('.symbol');
    
    symbolElement.classList.add('spinning');
    
    const duration = 2000 + i * 500;
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        symbolElement.textContent = 
          slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        spinIntervals.push(requestAnimationFrame(animate));
      } else {
        symbolElement.classList.remove('spinning');
        symbolElement.textContent = targetReels[reelIndex];
        symbolElement.classList.add('final');
        
        animationsCompleted++;
        
        if (animationsCompleted === 3) {
          setTimeout(() => {
            isSpinning = false;
            checkSlotsWin();
            renderSlots();
          }, 500);
        }
      }
    };
    
    setTimeout(() => {
      animate();
    }, i * 300);
  });
}

function clearAllSpinIntervals() {
  spinIntervals.forEach(interval => cancelAnimationFrame(interval));
  spinIntervals = [];
  
  document.querySelectorAll('.symbol').forEach(symbol => {
    symbol.classList.remove('spinning', 'final');
  });
}

function changeSlotBet(amount) {
  if (isSpinning) return;
  
  const currentIndex = BET_AMOUNTS.indexOf(slotBetAmount);
  let newIndex = currentIndex + amount;
  
  newIndex = Math.max(0, Math.min(newIndex, BET_AMOUNTS.length - 1));
  
  while (newIndex > 0 && BET_AMOUNTS[newIndex] > userData.stars) {
    newIndex--;
  }
  
  slotBetAmount = BET_AMOUNTS[newIndex];
  renderSlots();
}

function toggleBetSelection() {
  if (isSpinning) return;
  
  const betSelection = document.querySelector('.bet-selection');
  if (betSelection) {
    if (showBetSelection) {
      betSelection.style.animation = "scale-pulse 0.3s reverse forwards";
    } else {
      betSelection.style.animation = "scale-pulse 0.3s forwards";
    }
  }
  
  showBetSelection = !showBetSelection;
  renderSlots();
}

function startSpin() {
  if (isSpinning || userData.stars < slotBetAmount) return;
  
  isSpinning = true;
  currentWinAmount = 0;
  userData.stars -= slotBetAmount;
  
  slotsReels = [0, 1, 2].map(() => {
    if (Math.random() < JACKPOT_CHANCE) {
      return "7️⃣";
    }
    if (Math.random() < 0.20) {
      return "☠️";
    }
    const availableSymbols = slotSymbols.filter(s => s !== "7️⃣" && s !== "☠️");
    return availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
  });

  const isJackpot = slotsReels.every(s => s === "7️⃣");
  
  if (slotsReels.includes("7️⃣") && !isJackpot) {
    const sevenPos = Math.floor(Math.random() * 3);
    for (let i = 0; i < slotsReels.length; i++) {
      if (slotsReels[i] === "7️⃣" && i !== sevenPos) {
        const availableSymbols = slotSymbols.filter(s => s !== "7️⃣" && s !== "☠️");
        slotsReels[i] = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
      }
    }
  }

  renderSlots();
}

function checkSlotsWin() {
  currentWinAmount = 0;
  
  if (slotsReels.includes("☠️")) {
    showLoseAlert("ВЫ ПРОИГРАЛИ! ☠️");
    tg.HapticFeedback.notificationOccurred('error');
    return;
  }

  if (slotsReels.every(symbol => symbol === "7️⃣")) {
    currentWinAmount = jackpot;
    userData.stars += currentWinAmount;
    jackpot = 10000;
    showWinAlert(`ДЖЕКПОТ! ${currentWinAmount} ⭐`);
    tg.HapticFeedback.notificationOccurred('success');
    return;
  }

  if (slotsReels[0] === slotsReels[1] && slotsReels[1] === slotsReels[2]) {
    currentWinAmount = slotBetAmount * 10;
    userData.stars += currentWinAmount;
    showWinAlert(`ВЫИГРЫШ ${currentWinAmount} ⭐`);
    tg.HapticFeedback.notificationOccurred('success');
    return;
  }

  if (slotsReels[0] === slotsReels[1] || slotsReels[1] === slotsReels[2] || slotsReels[0] === slotsReels[2]) {
    currentWinAmount = slotBetAmount * 2;
    userData.stars += currentWinAmount;
    showWinAlert(`ВЫИГРЫШ ${currentWinAmount} ⭐`);
    tg.HapticFeedback.notificationOccurred('success');
    return;
  }

  showLoseAlert("ПОВЕЗЁТ В СЛЕДУЮЩИЙ РАЗ!");
}

function showLoseAlert(message) {
  const oldAlerts = document.querySelectorAll('.win-alert, .lose-alert');
  oldAlerts.forEach(alert => alert.remove());

  const alertBox = document.createElement('div');
  alertBox.className = 'lose-alert';
  alertBox.innerHTML = `
    <button class="alert-close-btn" onclick="this.parentElement.remove()">×</button>
    <div>${message}</div>
    <div class="skull-icon">☠️</div>
  `;
  document.body.appendChild(alertBox);
  
  setTimeout(() => {
    alertBox.remove();
  }, 5000);
}

function showWinAlert(message) {
  const oldAlerts = document.querySelectorAll('.win-alert, .lose-alert');
  oldAlerts.forEach(alert => alert.remove());

  const alertBox = document.createElement('div');
  alertBox.className = 'win-alert';
  alertBox.innerHTML = `
    <button class="alert-close-btn" onclick="this.parentElement.remove()">×</button>
    <div>${message}</div>
  `;
  document.body.appendChild(alertBox);
  
  setTimeout(() => {
    alertBox.remove();
  }, 5000);
}

function renderGame(gameId) {
  switch(gameId) {
    case 1:
      renderSlots();
      break;
    default:
      renderMainScreen();
  }
}

// Глобальные функции
window.toggleBetSelection = toggleBetSelection;
window.renderMainScreen = renderMainScreen;
window.renderGame = renderGame;
window.renderSlots = renderSlots;
window.startSpin = startSpin;
window.changeSlotBet = changeSlotBet;
window.renderDepositScreen = renderDepositScreen;
window.quickDeposit = quickDeposit;
window.processCustomDeposit = processCustomDeposit;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  // Проверяем наличие необходимых глобальных объектов
  if (!window.Telegram?.WebApp || !window.supabase) {
    renderErrorScreen("Не удалось загрузить необходимые библиотеки");
    return;
  }

  initApp();
});