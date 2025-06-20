// Инициализация WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Константы
const BET_AMOUNTS = [10, 25, 50, 100, 150, 200];
const JACKPOT_CHANCE = 0.02;
const MIN_DEPOSIT = 50;
const STAR_PRICE = 1.45;

const CARD_LINK_API_URL = "https://cardlink.example.com/api"; // Замените на реальный URL API Cardlink
const CARD_LINK_MERCHANT_ID = "YOUR_MERCHANT_ID"; // Ваш ID мерчанта в Cardlink

// Состояние приложения
let userStars = 5000;
let games = [
    { id: 1, name: "COMETA SLOTS", icon: "🎰" },
    { id: 2, name: "COSMIC COMET", icon: "☄️" },
    { id: 3, name: "CYBER DICE", icon: "🎯" },
    { id: 4, name: "COMET MASTERS", icon: "🚀" } // Новая игра
];

// слоты
let currentWinAmount = 0;
let showBetSelection = false;
let isSpinning = false;
let slotBetAmount = 100;
let slotsReels = ["💎", "💎", "💎"];
let jackpot = 25000;
const slotSymbols = ["💎", "🔮", "☠️", "🚀", "👾", "7️⃣", "⭐", "🍇"];
let spinIntervals = [];

   



// DOM элементы
const app = document.getElementById('app');

// ========== ФУНКЦИИ ПОПОЛНЕНИЯ ==========
function renderDepositScreen() {
    app.innerHTML = `
        <div class="header">
            <button onclick="renderMainScreen()">← Назад</button>
            <div class="balance">⭐ ${userStars}</div>
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
            // Создаем платеж через Cardlink
            createCardlinkPayment(amount, rubles)
                .then(paymentUrl => {
                    // Открываем платежную страницу Cardlink
                    tg.openLink(paymentUrl);
                    
                    // Здесь можно добавить проверку статуса платежа через вебхуки или поллинг
                    // В демо-версии просто добавляем звезды
                    userStars += amount;
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

// Добавьте новую функцию для создания платежа в Cardlink
function createCardlinkPayment(amount, rubles) {
    return new Promise((resolve, reject) => {
        // Здесь должна быть реальная логика API Cardlink
        // Это примерная реализация
        const paymentData = {
            merchant_id: CARD_LINK_MERCHANT_ID,
            amount: rubles,
            currency: "RUB",
            order_id: generateOrderId(),
            description: `Пополнение баланса на ${amount} звезд`,
            success_url: "https://yourdomain.com/success", // URL для редиректа после успешной оплаты
            fail_url: "https://yourdomain.com/fail", // URL для редиректа после неудачной оплаты
            callback_url: "https://yourdomain.com/callback" // URL для вебхука
        };

        // В реальном приложении здесь должен быть запрос к API Cardlink
        // Для демо просто возвращаем фиктивный URL
        setTimeout(() => {
            resolve("https://cardlink.example.com/pay?token=demo_token");
        }, 500);
    });
}

// Генератор ID заказа
function generateOrderId() {
    return 'ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}

// Добавьте обработку вебхуков (если поддерживается вашим сервером)
// Это нужно разместить на вашем бэкенде
function handleCardlinkWebhook(data) {
    // Проверяем подпись и статус платежа
    if (data.status === "success") {
        const amount = parseInt(data.amount / STAR_PRICE);
        // Обновляем баланс пользователя
        userStars += amount;
        tg.showAlert(`Баланс пополнен на ${amount}⭐`);
    }
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

// ========== ОСНОВНЫЕ ЭКРАНЫ ==========
function renderMainScreen() {
    app.innerHTML = `
        <div class="header">
            <h1 class="neon-text">Comet Of Luck</h1>
            <div class="balance">⭐ ${userStars}</div>
        </div>
        
        <div class="main-menu">
            <button class="deposit-btn" onclick="renderDepositScreen()">Пополнить баланс</button>
            
            <div class="games-scroll-container">
                <div class="games-grid">
                    ${games.map(game => `
                        <div class="game-card" onclick="renderGame(${game.id})">
                            <div class="game-icon">${game.icon}</div>
                            <div class="game-name">${game.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>SALAM</p>
        </div>
    `;
}

// ========== ИГРА В СЛОТЫ ==========
function renderSlots() {
    app.innerHTML = `
        <div class="header">
            <button onclick="renderMainScreen()">← Назад</button>
            <div class="balance">⭐ ${userStars}</div>
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
                    <button class="bet-arrow" onclick="changeSlotBet(1)" ${isSpinning || slotBetAmount >= BET_AMOUNTS[BET_AMOUNTS.length - 1] || BET_AMOUNTS[BET_AMOUNTS.indexOf(slotBetAmount) + 1] > userStars ? 'disabled' : ''}>
                        →
                    </button>
                    </div>
                    <div class="bet-quick-buttons">
                    ${BET_AMOUNTS.map(amount => `
                        <button 
                        onclick="slotBetAmount = ${amount}; renderSlots();" 
                        class="${amount === slotBetAmount ? 'active' : ''}" 
                        ${isSpinning || amount > userStars ? 'disabled' : ''}
                        >
                        ${amount}
                        </button>
                    `).join('')}
                    </div>
                </div>
                ` : ''}
                
                <button class="spin-button" onclick="startSpin()" ${isSpinning || userStars < slotBetAmount ? 'disabled' : ''}>
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
        
        // Добавляем класс spinning для анимации
        symbolElement.classList.add('spinning');
        
        const duration = 2000 + i * 500;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (progress < 1) {
                // Меняем символы во время вращения
                symbolElement.textContent = 
                    slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
                spinIntervals.push(requestAnimationFrame(animate));
            } else {
                // Завершаем анимацию
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

function highlightWinningSymbols() {
    const symbols = document.querySelectorAll('.symbol');
    symbols.forEach(symbol => symbol.classList.remove('win'));

    const uniqueSymbols = new Set(slotsReels);
    
    if (uniqueSymbols.size === 1) {
        symbols.forEach(symbol => symbol.classList.add('win'));
    } 
    else if (uniqueSymbols.size === 2) {
        const duplicateSymbol = [...slotsReels].find((symbol, index, arr) => 
            arr.indexOf(symbol) !== index
        );
        
        symbols.forEach((symbol, index) => {
            if (slotsReels[index] === duplicateSymbol) {
                symbol.classList.add('win');
            }
        });
    }
}

function clearAllSpinIntervals() {
    spinIntervals.forEach(interval => cancelAnimationFrame(interval));
    spinIntervals = [];
    
    // Также сбрасываем анимации символов
    document.querySelectorAll('.symbol').forEach(symbol => {
        symbol.classList.remove('spinning', 'final');
    });
}
function changeSlotBet(amount) {
    if (isSpinning) return;
    
    const currentIndex = BET_AMOUNTS.indexOf(slotBetAmount);
    let newIndex = currentIndex + amount;
    
    newIndex = Math.max(0, Math.min(newIndex, BET_AMOUNTS.length - 1));
    
    while (newIndex > 0 && BET_AMOUNTS[newIndex] > userStars) {
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
    if (isSpinning || userStars < slotBetAmount) return;
    
    isSpinning = true;
    currentWinAmount = 0;
    userStars -= slotBetAmount;
    
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
    currentWinAmount = 0; // Сбрасываем перед проверкой
    
    if (slotsReels.includes("☠️")) {
        showLoseAlert("ВЫ ПРОИГРАЛИ! ☠️");
        tg.HapticFeedback.notificationOccurred('error');
        return;
    }

    if (slotsReels.every(symbol => symbol === "7️⃣")) {
        currentWinAmount = jackpot;
        userStars += currentWinAmount;
        jackpot = 10000;
        showWinAlert(`ДЖЕКПОТ! ${currentWinAmount} ⭐`);
        tg.HapticFeedback.notificationOccurred('success');
        return;
    }

    if (slotsReels[0] === slotsReels[1] && slotsReels[1] === slotsReels[2]) {
        currentWinAmount = slotBetAmount * 10;
        userStars += currentWinAmount;
        showWinAlert(`ВЫИГРЫШ ${currentWinAmount} ⭐`);
        tg.HapticFeedback.notificationOccurred('success');
        return;
    }

    if (slotsReels[0] === slotsReels[1] || slotsReels[1] === slotsReels[2] || slotsReels[0] === slotsReels[2]) {
        currentWinAmount = slotBetAmount * 2;
        userStars += currentWinAmount;
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

document.addEventListener('click', function(event) {
    const alerts = document.querySelectorAll('.win-alert, .lose-alert');
    alerts.forEach(alert => {
        if (!alert.contains(event.target)) {
            alert.remove();
        }
    });
});

// Инициализация
renderMainScreen();

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