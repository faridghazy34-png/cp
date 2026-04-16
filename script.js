/**
 * =========================================================
 * Kalkulator Pintar NLP - Main Script
 * =========================================================
 */

// =============================================
// STATE
// =============================================
let currentInput = '0';
let previousInput = '';
let currentOperator = null;
let shouldResetDisplay = false;
let history = [];
let settings = {
    sound: false,
    haptic: true,
    history: true
};

// =============================================
// MODE SWITCHING
// =============================================

function switchMode(mode) {
    // Update buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    const modeMap = {
        'calc': 'btnCalcMode',
        'history': 'btnHistoryMode',
        'nlp': 'btnNlpMode',
        'settings': 'btnSettingsMode'
    };
    document.getElementById(modeMap[mode]).classList.add('active');

    // Update panels
    document.querySelectorAll('.mode-panel').forEach(panel => panel.classList.remove('active'));
    const panelMap = {
        'calc': 'panelCalc',
        'history': 'panelHistory',
        'nlp': 'panelNlp',
        'settings': 'panelSettings'
    };
    document.getElementById(panelMap[mode]).classList.add('active');

    // Auto-focus NLP input
    if (mode === 'nlp') {
        setTimeout(() => {
            document.getElementById('nlpInput').focus();
        }, 300);
    }
}

// =============================================
// CALCULATOR FUNCTIONS
// =============================================

function inputNumber(num) {
    triggerHaptic();
    
    if (shouldResetDisplay) {
        currentInput = num;
        shouldResetDisplay = false;
    } else {
        if (currentInput === '0' && num !== '0') {
            currentInput = num;
        } else if (currentInput === '0' && num === '0') {
            return;
        } else {
            // Limit digit count
            if (currentInput.replace(/[^0-9]/g, '').length >= 15) return;
            currentInput += num;
        }
    }
    updateDisplay();
}

function inputDecimal() {
    triggerHaptic();
    
    if (shouldResetDisplay) {
        currentInput = '0,';
        shouldResetDisplay = false;
    } else if (!currentInput.includes(',')) {
        currentInput += ',';
    }
    updateDisplay();
}

function inputOperator(op) {
    triggerHaptic();
    
    if (currentOperator && !shouldResetDisplay) {
        calculate();
    }

    previousInput = currentInput;
    currentOperator = op;
    shouldResetDisplay = true;

    updateExpressionDisplay();
    highlightOperator(op);
}

function inputPercent() {
    triggerHaptic();
    
    const current = parseInputNumber(currentInput);
    
    if (previousInput && currentOperator) {
        // X op Y% → X op (X * Y/100)
        const base = parseInputNumber(previousInput);
        const percentValue = base * (current / 100);
        currentInput = formatDisplayNumber(percentValue);
    } else {
        // Just divide by 100
        currentInput = formatDisplayNumber(current / 100);
    }
    
    updateDisplay();
}

function backspace() {
    triggerHaptic();
    
    if (shouldResetDisplay) return;

    if (currentInput.length > 1) {
        currentInput = currentInput.slice(0, -1);
    } else {
        currentInput = '0';
    }
    updateDisplay();
}

function clearAll() {
    triggerHaptic();
    
    currentInput = '0';
    previousInput = '';
    currentOperator = null;
    shouldResetDisplay = false;
    
    document.getElementById('displayExpression').textContent = '';
    document.querySelectorAll('.key-op').forEach(k => k.classList.remove('active-op'));
    updateDisplay();
}

function calculate() {
    triggerHaptic();
    
    if (!currentOperator || !previousInput) {
        return;
    }

    const prev = parseInputNumber(previousInput);
    const current = parseInputNumber(currentInput);
    let result;

    const expressionText = `${previousInput} ${currentOperator} ${currentInput}`;

    switch (currentOperator) {
        case '+':
            result = prev + current;
            break;
        case '−':
            result = prev - current;
            break;
        case '×':
            result = prev * current;
            break;
        case '÷':
            if (current === 0) {
                showError('Tidak bisa dibagi nol');
                return;
            }
            result = prev / current;
            break;
        default:
            return;
    }

    // Save to history
    if (settings.history) {
        addToHistory(expressionText, result, 'Kalkulasi');
    }

    // Update display
    document.getElementById('displayExpression').textContent = expressionText + ' =';
    currentInput = formatDisplayNumber(result);
    previousInput = '';
    currentOperator = null;
    shouldResetDisplay = true;

    document.querySelectorAll('.key-op').forEach(k => k.classList.remove('active-op'));
    updateDisplay();
}

function copyResult() {
    triggerHaptic();
    
    const result = document.getElementById('displayResult').textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(result).then(() => {
            showToast('Hasil disalin ke clipboard! 📋');
        }).catch(() => {
            fallbackCopy(result);
        });
    } else {
        fallbackCopy(result);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('Hasil disalin ke clipboard! 📋');
}

// =============================================
// DISPLAY HELPERS
// =============================================

function parseInputNumber(str) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
}

function formatDisplayNumber(num) {
    if (!isFinite(num)) return 'Error';
    
    // Round to avoid floating point
    const rounded = Math.round(num * 1000000000) / 1000000000;
    
    if (Number.isInteger(rounded)) {
        return rounded.toLocaleString('id-ID');
    }
    
    // Limit decimals
    const str = rounded.toLocaleString('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
    });
    
    return str;
}

function updateDisplay() {
    const display = document.getElementById('displayResult');
    display.textContent = currentInput;
    display.classList.remove('small', 'error');
    
    if (currentInput.length > 12) {
        display.classList.add('small');
    }
}

function updateExpressionDisplay() {
    const expr = document.getElementById('displayExpression');
    expr.textContent = `${previousInput} ${currentOperator}`;
}

function highlightOperator(op) {
    document.querySelectorAll('.key-op').forEach(k => k.classList.remove('active-op'));
    
    const opMap = {
        '÷': 'keyDivide',
        '×': 'keyMultiply',
        '−': 'keyMinus',
        '+': 'keyPlus'
    };
    
    const key = document.getElementById(opMap[op]);
    if (key) key.classList.add('active-op');
}

function showError(msg) {
    const display = document.getElementById('displayResult');
    display.textContent = msg;
    display.classList.add('error');
    
    setTimeout(() => {
        clearAll();
    }, 2000);
}

// =============================================
// HISTORY
// =============================================

function addToHistory(expression, result, type) {
    const item = {
        expression,
        result,
        formattedResult: typeof result === 'number' ? formatDisplayNumber(result) : result,
        type,
        timestamp: new Date().toLocaleString('id-ID')
    };
    
    history.unshift(item);
    if (history.length > 50) history.pop();
    
    renderHistory();
    saveHistoryToStorage();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    
    if (history.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12,6 12,12 16,14"/>
                </svg>
                <p>Belum ada riwayat perhitungan</p>
            </div>
        `;
        return;
    }

    list.innerHTML = history.map((item, i) => `
        <div class="history-item" onclick="useHistoryItem(${i})" id="historyItem${i}">
            <div class="history-expr">${escapeHtml(item.expression)}</div>
            <div class="history-result">= ${escapeHtml(item.formattedResult)}</div>
            <div class="history-type">${escapeHtml(item.type)} • ${item.timestamp}</div>
        </div>
    `).join('');
}

function useHistoryItem(index) {
    const item = history[index];
    if (typeof item.result === 'number') {
        currentInput = formatDisplayNumber(item.result);
        previousInput = '';
        currentOperator = null;
        shouldResetDisplay = true;
        switchMode('calc');
        updateDisplay();
        document.getElementById('displayExpression').textContent = item.expression + ' =';
    }
}

function clearHistory() {
    history = [];
    renderHistory();
    saveHistoryToStorage();
    showToast('Riwayat dihapus 🗑️');
}

function saveHistoryToStorage() {
    try {
        localStorage.setItem('calc_history', JSON.stringify(history));
    } catch (e) {}
}

function loadHistoryFromStorage() {
    try {
        const saved = localStorage.getItem('calc_history');
        if (saved) {
            history = JSON.parse(saved);
            renderHistory();
        }
    } catch (e) {}
}

// =============================================
// NLP CHAT
// =============================================

function solveStoryProblem() {
    const input = document.getElementById('nlpInput');
    const text = input.value.trim();
    
    if (!text) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Add user message
    addNlpMessage('user', text);

    // Show loading
    const loadingId = addNlpLoading();

    // Simulate brief processing delay for UX
    setTimeout(() => {
        removeNlpLoading(loadingId);
        
        // Solve with NLP Engine
        const solution = nlpEngine.solve(text);
        
        if (solution.success) {
            addNlpSolution(solution);
            
            // Save to history
            if (settings.history) {
                addToHistory(
                    text.substring(0, 80) + (text.length > 80 ? '...' : ''),
                    solution.result,
                    'Elhitung: ' + solution.operation
                );
            }
        } else {
            addNlpMessage('bot', `⚠️ ${solution.error}`);
        }
    }, 800 + Math.random() * 600);
}

function addNlpMessage(role, content) {
    const chat = document.getElementById('nlpChat');
    const avatar = role === 'user' ? '👤' : '🧠';
    
    const msgDiv = document.createElement('div');
    msgDiv.className = `nlp-message nlp-${role}`;
    msgDiv.innerHTML = `
        <div class="nlp-avatar">${avatar}</div>
        <div class="nlp-bubble">
            <p>${escapeHtml(content)}</p>
        </div>
    `;
    
    chat.appendChild(msgDiv);
    scrollNlpToBottom();
}

function addNlpSolution(solution) {
    const chat = document.getElementById('nlpChat');
    
    let stepsHtml = solution.steps.map((step, i) => `
        <div class="nlp-step">
            <span class="nlp-step-num">${i + 1}</span>
            <span>${escapeHtml(step)}</span>
        </div>
    `).join('');

    const msgDiv = document.createElement('div');
    msgDiv.className = 'nlp-message nlp-bot elhitung-response';
    msgDiv.innerHTML = `
        <div class="nlp-avatar">🧠</div>
        <div class="nlp-bubble">
            <p>📊 Terdeteksi sebagai soal <strong>${escapeHtml(solution.operation)}</strong></p>
            <div class="nlp-solution">
                <div class="nlp-solution-title">Langkah Penyelesaian</div>
                ${stepsHtml}
            </div>
            <div class="nlp-final-answer">
                <span class="nlp-final-label">Jawaban</span>
                <span class="nlp-final-value">${escapeHtml(solution.formattedResult)}</span>
            </div>
        </div>
    `;
    
    chat.appendChild(msgDiv);
    scrollNlpToBottom();
}

function addNlpLoading() {
    const chat = document.getElementById('nlpChat');
    const id = 'loading-' + Date.now();
    
    const loadDiv = document.createElement('div');
    loadDiv.className = 'nlp-message nlp-bot';
    loadDiv.id = id;
    loadDiv.innerHTML = `
        <div class="nlp-avatar">🧠</div>
        <div class="nlp-bubble">
            <div class="nlp-loading">
                <div class="nlp-loading-dot"></div>
                <div class="nlp-loading-dot"></div>
                <div class="nlp-loading-dot"></div>
            </div>
        </div>
    `;
    
    chat.appendChild(loadDiv);
    scrollNlpToBottom();
    return id;
}

function removeNlpLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollNlpToBottom() {
    const chat = document.getElementById('nlpChat');
    setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
    }, 50);
}

function useExample(btn) {
    const text = btn.textContent;
    document.getElementById('nlpInput').value = text;
    solveStoryProblem();
}

// =============================================
// SETTINGS
// =============================================

function toggleSetting(key) {
    settings[key] = !settings[key];
    saveSettings();
}

function saveSettings() {
    try {
        localStorage.setItem('calc_settings', JSON.stringify(settings));
    } catch (e) {}
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('calc_settings');
        if (saved) {
            settings = { ...settings, ...JSON.parse(saved) };
        }
        // Sync toggles
        document.getElementById('toggleSound').checked = settings.sound;
        document.getElementById('toggleHaptic').checked = settings.haptic;
        document.getElementById('toggleHistory').checked = settings.history;
    } catch (e) {}
}

// =============================================
// HAPTIC & SOUND
// =============================================

function triggerHaptic() {
    if (settings.haptic && navigator.vibrate) {
        navigator.vibrate(10);
    }
}

// =============================================
// TOAST
// =============================================

function showToast(message) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// =============================================
// UTILITY
// =============================================

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// =============================================
// KEYBOARD SUPPORT
// =============================================

document.addEventListener('keydown', (e) => {
    // Only handle when in calc mode
    const calcPanel = document.getElementById('panelCalc');
    if (!calcPanel.classList.contains('active')) {
        // Handle Enter in NLP mode
        if (e.key === 'Enter' && !e.shiftKey) {
            const nlpPanel = document.getElementById('panelNlp');
            if (nlpPanel.classList.contains('active')) {
                const nlpInput = document.getElementById('nlpInput');
                if (document.activeElement === nlpInput && nlpInput.value.trim()) {
                    e.preventDefault();
                    solveStoryProblem();
                }
            }
        }
        return;
    }

    const key = e.key;
    
    if (key >= '0' && key <= '9') {
        e.preventDefault();
        inputNumber(key);
    } else if (key === '.' || key === ',') {
        e.preventDefault();
        inputDecimal();
    } else if (key === '+') {
        e.preventDefault();
        inputOperator('+');
    } else if (key === '-') {
        e.preventDefault();
        inputOperator('−');
    } else if (key === '*') {
        e.preventDefault();
        inputOperator('×');
    } else if (key === '/') {
        e.preventDefault();
        inputOperator('÷');
    } else if (key === '%') {
        e.preventDefault();
        inputPercent();
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault();
        calculate();
    } else if (key === 'Backspace') {
        e.preventDefault();
        backspace();
    } else if (key === 'Escape' || key === 'Delete') {
        e.preventDefault();
        clearAll();
    }
});

// Auto-resize NLP textarea
document.addEventListener('DOMContentLoaded', () => {
    const nlpInput = document.getElementById('nlpInput');
    nlpInput.addEventListener('input', () => {
        nlpInput.style.height = 'auto';
        nlpInput.style.height = Math.min(nlpInput.scrollHeight, 120) + 'px';
    });
});

// =============================================
// INITIALIZATION
// =============================================

function init() {
    loadSettings();
    loadHistoryFromStorage();
    updateDisplay();
}

// Run on load
init();
