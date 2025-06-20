if (!window.Telegram?.WebApp) {
  document.body.innerHTML = `
    <div style="padding: 20px; color: white; text-align: center; font-family: sans-serif;">
      <h2>Требуется Telegram</h2>
      <p>Пожалуйста, откройте это приложение через Telegram</p>
    </div>
  `;
  throw new Error('Telegram WebApp не доступен');
}

const tg = window.Telegram.WebApp;
tg.expand(        );

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

// Инициализация Supabase
let supabaseClient;
try {
  supabaseClient = supabase.createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.KEY);
  console.log('Supabase инициализирован');
} catch (error) {
  console.error('Ошибка инициализации Supabase:', error);
  renderErrorScreen('Ошибка подключения к базе данных');
}

async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Ошибка подключения к Supabase:', error);
    return false;
  }
}


// Состояние приложения
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
    jackpot: 25000,
    symbols: ["💎", "🔮", "☠️", "🚀", "👾", "7️⃣", "⭐", "🍇"],
    spinIntervals: []
  }
};

// DOM элементы
const app = document.getElementById('app');

// Функции работы с пользователем
async function saveUserData() {
  if (!state.user.id) return;
  
  const { error } = await supabaseClient
    .from('users')
    .upsert({
      id: state.user.id,
      stars: state.user.stars,
      nickname: state.user.nickname,
      last_seen: new Date().toISOString()
    });
  
  if (error) console.error('Save error:', error);
}

async function loadUserData(userId) {
  try {
    const { data, error } = await supabaseClient
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

    const { error } = await supabaseClient
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
    const { error } = await supabaseClient
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

// Основные функции приложения
async function initApp() {
  // Показываем экран загрузки
  renderLoadingScreen();
  
  // Проверяем подключение к Supabase
  const isConnected = await checkSupabaseConnection();
  if (!isConnected) {
    renderErrorScreen('Ошибка подключения к серверу');
    return;
  }
  
  // Проверяем авторизацию пользователя
  if (!tg.initDataUnsafe?.user?.id) {
    renderErrorScreen('Требуется авторизация в Telegram');
    return;
  }
  
  const userId = tg.initDataUnsafe.user.id.toString();
  
  try {
    // Загружаем или создаем пользователя
    const userData = await loadOrCreateUser(userId);
    if (!userData) {
      throw new Error('Не удалось загрузить данные пользователя');
    }
    
    // Рендерим основной интерфейс
    renderMainScreen();
  } catch (error) {
    console.error('Ошибка инициализации:', error);
    renderErrorScreen('Ошибка загрузки данных');
  }
}

async function loadOrCreateUser(userId) {
  try {
    // Пробуем загрузить пользователя
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (!error && user) return user;
    
    // Создаем нового пользователя
    const newUser = {
      id: userId,
      stars: 5000,
      nickname: tg.initDataUnsafe.user?.first_name || 'Гость',
      last_seen: new Date().toISOString()
    };
    
    const { error: createError } = await supabase
      .from('users')
      .insert([newUser]);
    
    if (createError) throw createError;
    return newUser;
  } catch (error) {
    console.error('Ошибка работы с пользователем:', error);
    return null;
  }
}
// Функции отображения
function renderLoadingScreen() {
  document.getElementById('app').innerHTML = `
    <div style="text-align: center; padding: 50px;">
      <p>Подключение к серверу...</p>
    </div>
  `;

function renderErrorScreen(message) {
  document.getElementById('app').innerHTML = `
    <div style="padding: 20px; color: white; text-align: center;">
      <h2>Ошибка</h2>
      <p>${message}</p>
      <button onclick="window.location.reload()" 
              style="padding: 10px 20px; background: #3498db; color: white; border: none; border-radius: 5px;">
        Попробовать снова
      </button>
    </div>
  `;
}


function renderMainScreen() {
  document.getElementById('app').innerHTML = `
    <div class="header">
      <h1>Comet Of Luck</h1>
      <div class="balance">⭐ ${state.user.stars}</div>
    </div>
    <div class="main-menu">
      <button class="deposit-btn" onclick="renderDepositScreen()">Пополнить баланс</button>
      <div class="games-grid">
        ${state.games.map(game => `
          <div class="game-card" onclick="renderGame(${game.id})">
            <div class="game-icon">${game.icon}</div>
            <div class="game-name">${game.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderDepositScreen() {
  app.innerHTML = `
    <div class="header">
      <button onclick="window.renderMainScreen()">← Назад</button>
      <div class="balance">⭐ ${state.user.stars}</div>
    </div>
    
    <div class="deposit-container">
      <h2 class="neon-text">Пополнение баланса</h2>
      <div class="rate-info">1 ⭐ = ${CONFIG.STAR_PRICE} ₽</div>
      
      <div class="deposit-options">
        <button onclick="window.quickDeposit(50)">50⭐ (${(50 * CONFIG.STAR_PRICE).toFixed(2)}₽)</button>
        <button onclick="window.quickDeposit(100)">100⭐ (${(100 * CONFIG.STAR_PRICE).toFixed(2)}₽)</button>
        <button onclick="window.quickDeposit(200)">200⭐ (${(200 * CONFIG.STAR_PRICE).toFixed(2)}₽)</button>
      </div>
      
      <div class="custom-deposit">
        <h3>Свое количество</h3>
        <div class="input-group">
          <input type="number" id="depositAmount" placeholder="От ${CONFIG.MIN_DEPOSIT}⭐" min="${CONFIG.MIN_DEPOSIT}">
          <button onclick="window.processCustomDeposit()">OK</button>
        </div>
        <div class="min-deposit">Минимум ${CONFIG.MIN_DEPOSIT}⭐</div>
      </div>
    </div>
  `;
}

// Игра в слоты
function renderSlots() {
  app.innerHTML = `
    <div class="header">
      <button onclick="renderMainScreen()">← Назад</button>
      <div class="balance">⭐ ${state.user.stars}</div>
    </div>
    <div class="game-container">
      <div class="slots-header">
        <h2>Comet-Slots</h2>
        <div class="jackpot">Джекпот: ${state.slots.jackpot} ⭐</div>
      </div>
      
      <div class="slots-machine">
        <div class="slots-reels-container">
          <div class="slots-reels">
            ${[0, 1, 2].map(index => `
              <div class="reel-frame ${state.slots.reels[0] === state.slots.reels[1] && state.slots.reels[1] === state.slots.reels[2] ? 'win' : ''}">
                <div class="reel-glass"></div>
                <div class="reel-container">
                  <div class="reel" id="reel-${index}">
                    <div class="symbol-container">
                      <div class="symbol ${!state.slots.isSpinning && state.slots.reels[index] === "☠️" ? 'skull' : ''}">
                        ${state.slots.isSpinning ? state.slots.symbols[Math.floor(Math.random() * state.slots.symbols.length)] : state.slots.reels[index]}
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
        <div class="current-bet">Ставка: ${state.slots.betAmount} ⭐</div>
        <div class="current-win">Выигрыш: ${state.slots.currentWin} ⭐</div>
      </div>
      
      <div class="slots-controls">
        <button class="toggle-bet-button" onclick="toggleBetSelection()" ${state.slots.isSpinning ? 'disabled' : ''}>
          ${state.slots.showBetSelection ? '▲ Скрыть ставки ▲' : '▼ Выбрать ставку ▼'}
        </button>
        
        ${state.slots.showBetSelection ? `
        <div class="bet-selection">
          <div class="bet-arrows">
            <button class="bet-arrow" onclick="changeSlotBet(-1)" ${state.slots.isSpinning || state.slots.betAmount <= CONFIG.BET_AMOUNTS[0] ? 'disabled' : ''}>
              ←
            </button>
            <div class="bet-amount">${state.slots.betAmount} ⭐</div>
            <button class="bet-arrow" onclick="changeSlotBet(1)" ${state.slots.isSpinning || state.slots.betAmount >= CONFIG.BET_AMOUNTS[CONFIG.BET_AMOUNTS.length - 1] || CONFIG.BET_AMOUNTS[CONFIG.BET_AMOUNTS.indexOf(state.slots.betAmount) + 1] > state.user.stars ? 'disabled' : ''}>
              →
            </button>
          </div>
          <div class="bet-quick-buttons">
            ${CONFIG.BET_AMOUNTS.map(amount => `
              <button 
                onclick="state.slots.betAmount = ${amount}; renderSlots();" 
                class="${amount === state.slots.betAmount ? 'active' : ''}" 
                ${state.slots.isSpinning || amount > state.user.stars ? 'disabled' : ''}
              >
                ${amount}
              </button>
            `).join('')}
          </div>
        </div>
        ` : ''}
        
        <button class="spin-button" onclick="startSpin()" ${state.slots.isSpinning || state.user.stars < state.slots.betAmount ? 'disabled' : ''}>
          ${state.slots.isSpinning ? 'КРУТИТСЯ...' : 'КРУТИТЬ'}
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

  if (state.slots.isSpinning) {
    startSpinAnimations();
  }
}

function startSpinAnimations() {
  clearAllSpinIntervals();
  
  const targetReels = [...state.slots.reels];
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
          state.slots.symbols[Math.floor(Math.random() * state.slots.symbols.length)];
        state.slots.spinIntervals.push(requestAnimationFrame(animate));
      } else {
        symbolElement.classList.remove('spinning');
        symbolElement.textContent = targetReels[reelIndex];
        symbolElement.classList.add('final');
        
        animationsCompleted++;
        
        if (animationsCompleted === 3) {
          setTimeout(() => {
            state.slots.isSpinning = false;
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

function quickDeposit(amount) {
  const rubles = (amount * CONFIG.STAR_PRICE).toFixed(2);
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
      merchant_id: CONFIG.CARD_LINK.MERCHANT_ID,
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
  
  if (amount < CONFIG.MIN_DEPOSIT) {
    tg.showAlert(`Минимальное пополнение ${CONFIG.MIN_DEPOSIT}⭐`);
    input.focus();
    return;
  }
  
  quickDeposit(amount);
  input.value = '';
}

function clearAllSpinIntervals() {
  state.slots.spinIntervals.forEach(interval => cancelAnimationFrame(interval));
  state.slots.spinIntervals = [];
  
  document.querySelectorAll('.symbol').forEach(symbol => {
    symbol.classList.remove('spinning', 'final');
  });
}

function changeSlotBet(amount) {
  if (state.slots.isSpinning) return;
  
  const currentIndex = CONFIG.BET_AMOUNTS.indexOf(state.slots.betAmount);
  let newIndex = currentIndex + amount;
  
  newIndex = Math.max(0, Math.min(newIndex, CONFIG.BET_AMOUNTS.length - 1));
  
  while (newIndex > 0 && CONFIG.BET_AMOUNTS[newIndex] > state.user.stars) {
    newIndex--;
  }
  
  state.slots.betAmount = CONFIG.BET_AMOUNTS[newIndex];
  renderSlots();
}

function toggleBetSelection() {
  if (state.slots.isSpinning) return;
  state.slots.showBetSelection = !state.slots.showBetSelection;
  renderSlots();
}

function startSpin() {
  if (state.slots.isSpinning || state.user.stars < state.slots.betAmount) return;
  
  state.slots.isSpinning = true;
  state.slots.currentWin = 0;
  state.user.stars -= state.slots.betAmount;
  
  state.slots.reels = [0, 1, 2].map(() => {
    if (Math.random() < CONFIG.JACKPOT_CHANCE) {
      return "7️⃣";
    }
    if (Math.random() < 0.20) {
      return "☠️";
    }
    const availableSymbols = state.slots.symbols.filter(s => s !== "7️⃣" && s !== "☠️");
    return availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
  });

  const isJackpot = state.slots.reels.every(s => s === "7️⃣");
  
  if (state.slots.reels.includes("7️⃣") && !isJackpot) {
    const sevenPos = Math.floor(Math.random() * 3);
    for (let i = 0; i < state.slots.reels.length; i++) {
      if (state.slots.reels[i] === "7️⃣" && i !== sevenPos) {
        const availableSymbols = state.slots.symbols.filter(s => s !== "7️⃣" && s !== "☠️");
        state.slots.reels[i] = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
      }
    }
  }

  renderSlots();
}

function checkSlotsWin() {
  state.slots.currentWin = 0;
  
  if (state.slots.reels.includes("☠️")) {
    showLoseAlert("ВЫ ПРОИГРАЛИ! ☠️");
    tg.HapticFeedback.notificationOccurred('error');
    return;
  }

  if (state.slots.reels.every(symbol => symbol === "7️⃣")) {
    state.slots.currentWin = state.slots.jackpot;
    state.user.stars += state.slots.currentWin;
    state.slots.jackpot = 10000;
    showWinAlert(`ДЖЕКПОТ! ${state.slots.currentWin} ⭐`);
    tg.HapticFeedback.notificationOccurred('success');
    return;
  }

  if (state.slots.reels[0] === state.slots.reels[1] && state.slots.reels[1] === state.slots.reels[2]) {
    state.slots.currentWin = state.slots.betAmount * 10;
    state.user.stars += state.slots.currentWin;
    showWinAlert(`ВЫИГРЫШ ${state.slots.currentWin} ⭐`);
    tg.HapticFeedback.notificationOccurred('success');
    return;
  }

  if (state.slots.reels[0] === state.slots.reels[1] || state.slots.reels[1] === state.slots.reels[2] || state.slots.reels[0] === state.slots.reels[2]) {
    state.slots.currentWin = state.slots.betAmount * 2;
    state.user.stars += state.slots.currentWin;
    showWinAlert(`ВЫИГРЫШ ${state.slots.currentWin} ⭐`);
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
window.initApp = initApp;
window.toggleBetSelection = toggleBetSelection;
window.renderMainScreen = renderMainScreen;
window.renderGame = renderGame;
window.renderSlots = renderSlots;
window.startSpin = startSpin;
window.changeSlotBet = changeSlotBet;
window.renderDepositScreen = renderDepositScreen;
window.quickDeposit = quickDeposit;
window.processCustomDeposit = processCustomDeposit;
window.createCardlinkPayment = createCardlinkPayment;
window.generateOrderId = generateOrderId;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
  if (!window.Telegram?.WebApp || !window.supabase) {
    renderErrorScreen(
      "Ошибка загрузки", 
      "Не удалось загрузить необходимые библиотеки"
    );
    return;
  }
  
  initApp();
});