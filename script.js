const resultEl = document.getElementById('result');
const historyEl = document.getElementById('history');
const historyListEl = document.getElementById('historyList');
const toggleModeBtn = document.getElementById('toggleMode');
const toggleThemeBtn = document.getElementById('toggleTheme');
const copyResultBtn = document.getElementById('copyResult');
const standardGrid = document.getElementById('standardBtnGrid');
const scientificGrid = document.getElementById('scientificBtnGrid');

let expression = '';
let lastResult = null;
let scientificMode = false;
let darkMode = true;

function setTheme(mode) {
  darkMode = mode === 'dark';
  document.body.classList.toggle('light', !darkMode);
  toggleThemeBtn.textContent = `Theme: ${darkMode ? 'Dark' : 'Light'}`;
}

function appendHistory(entry) {
  const items = JSON.parse(localStorage.getItem('calcHistory') || '[]');
  items.unshift(entry);
  while (items.length > 7) items.pop();
  localStorage.setItem('calcHistory', JSON.stringify(items));
  historyListEl.innerHTML = items.map(i => `<div>${i}</div>`).join('');
}

function loadHistory() {
  const items = JSON.parse(localStorage.getItem('calcHistory') || '[]');
  historyListEl.innerHTML = items.map(i => `<div>${i}</div>`).join('');
}

const sanitizeExpression = (expr) => {
  const replaced = expr
    .replace(/÷/g, '/')
    .replace(/×/g, '*')
    .replace(/mod/g, '%')
    .replace(/\^/g, '**')
    .replace(/π/g, String(Math.PI))
    .replace(/e\b/g, String(Math.E));

  if (!/^[0-9+\-*/()%.eE\s]*$/.test(replaced)) {
    throw new Error('Invalid characters');
  }

  if (/\b(?:alert|window|document|eval|Function|constructor|process)\b/.test(replaced)) {
    throw new Error('Unsafe expression');
  }

  return replaced;
};

function safeEval(expr) {
  if (!expr.trim()) return 0;
  const sanitized = sanitizeExpression(expr);
  if (/[+\-*/]{2,}/.test(sanitized.replace(/\*\*|%/g, ''))) {
    throw new Error('Invalid operator sequence');
  }

  const value = Function('"use strict"; return (' + sanitized + ')')();
  if (!Number.isFinite(value)) {
    throw new Error('Result not finite');
  }

  return value;
}

function setHistory(text) {
  historyEl.textContent = text || '\u00A0';
}

function updateDisplay() {
  resultEl.value = expression || '0';
}

function clearAll() {
  expression = '';
  lastResult = null;
  setHistory('');
  updateDisplay();
}

function clearEntry() {
  expression = '';
  updateDisplay();
}

function backspace() {
  expression = expression.slice(0, -1);
  updateDisplay();
}

function appendValue(value) {
  if (expression === '' && ['+', '*', '/', ')'].includes(value)) return;
  if (value === '.' && /\.[0-9]*$/.test(expression)) return;

  if (['+', '-', '*', '/', '%', ')', '^'].includes(value) && ['+', '-', '*', '/', '%', '^', ''].includes(expression.slice(-1))) {
    if (expression.slice(-1) !== '' && expression.slice(-1) !== '.') {
      expression = expression.slice(0, -1);
    }
  }

  expression += value;
  updateDisplay();
}

function formatNumber(value) {
  let n = Number(value);
  if (!Number.isFinite(n)) return 'Error';
  const asString = n.toString();
  if (asString.length <= 12) return asString;
  return n.toPrecision(12);
}

function applyMathFunction(name) {
  try {
    const baseValue = expression ? safeEval(expression) : lastResult ?? 0;
    let result;

    switch (name) {
      case 'sqrt': result = Math.sqrt(baseValue); break;
      case 'square': result = baseValue ** 2; break;
      case 'inverse': result = 1 / baseValue; break;
      case 'percent': result = baseValue / 100; break;
      case 'sin': result = Math.sin(baseValue); break;
      case 'cos': result = Math.cos(baseValue); break;
      case 'tan': result = Math.tan(baseValue); break;
      case 'ln': result = Math.log(baseValue); break;
      case 'log': result = Math.log10(baseValue); break;
      case 'exp': result = Math.exp(baseValue); break;
      case 'pi': result = Math.PI; break;
      case 'e': result = Math.E; break;
      default: return;
    }

    if (!Number.isFinite(result)) throw new Error('Invalid result');
    lastResult = result;
    expression = formatNumber(result);
    setHistory(`${name}(${baseValue})`);
    appendHistory(`${name}(${baseValue}) = ${expression}`);
    updateDisplay();
  } catch (err) {
    resultEl.value = 'Error';
    expression = '';
    setHistory('Error');
  }
}

function compute() {
  try {
    if (!expression) return;
    const value = safeEval(expression);
    lastResult = value;
    const output = formatNumber(value);
    setHistory(`${expression} =`);
    appendHistory(`${expression} = ${output}`);
    expression = output;
    updateDisplay();
  } catch (err) {
    resultEl.value = 'Error';
    expression = '';
    setHistory('Error');
  }
}

function toggleSign() {
  if (!expression) return;
  try {
    const value = safeEval(expression);
    const toggled = -value;
    expression = formatNumber(toggled);
    updateDisplay();
  } catch (err) {
    resultEl.value = 'Error';
    expression = '';
  }
}

function toggleScientificMode() {
  scientificMode = !scientificMode;
  scientificGrid.classList.toggle('hidden', !scientificMode);
  toggleModeBtn.textContent = scientificMode ? 'Standard Mode' : 'Scientific Mode';
}

function copyResult() {
  const value = resultEl.value;
  navigator.clipboard?.writeText(value).catch(() => {
    alert('Clipboard copy is not supported in this environment.');
  });
}

function mapKeyToAction(event) {
  const { key } = event;
  const operators = ['+', '-', '*', '/', '^'];

  if (/^[0-9]$/.test(key)) return appendValue(key);
  if (operators.includes(key)) return appendValue(key);
  if (key === '.') return appendValue('.');
  if (key === 'Enter' || key === '=') { event.preventDefault(); return compute(); }
  if (key === 'Backspace') return backspace();
  if (key === 'Escape') return clearAll();
  if (key === '%') return appendValue('%');
  if (key === '(' || key === ')') return appendValue(key);
}

standardGrid.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const value = btn.dataset.value;

    if (action === 'clear') return clearAll();
    if (action === 'clear-entry') return clearEntry();
    if (action === 'backspace') return backspace();
    if (action === 'equals') return compute();
    if (action === 'toggle-sign') return toggleSign();

    if (value) return appendValue(value);
  });
});

scientificGrid.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;

    switch (action) {
      case 'pi': return applyMathFunction('pi');
      case 'e': return applyMathFunction('e');
      case 'sqrt': return applyMathFunction('sqrt');
      case 'sin': return applyMathFunction('sin');
      case 'cos': return applyMathFunction('cos');
      case 'tan': return applyMathFunction('tan');
      case 'ln': return applyMathFunction('ln');
      case 'log': return applyMathFunction('log');
      case 'exp': return applyMathFunction('exp');
      case 'percent': return applyMathFunction('percent');
      case 'mod': return appendValue('%');
      case 'power': return appendValue('^');
    }
  });
});

toggleModeBtn.addEventListener('click', toggleScientificMode);
toggleThemeBtn.addEventListener('click', () => setTheme(darkMode ? 'light' : 'dark'));
copyResultBtn.addEventListener('click', copyResult);
window.addEventListener('keydown', mapKeyToAction);

loadHistory();
setTheme('dark');
clearAll();
