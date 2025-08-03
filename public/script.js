/*
  Zentrales Skript für die Haushaltsplaner‑App. Hier werden alle
  dynamischen Elemente erzeugt und verwaltet, Daten im
  localStorage gespeichert und die Berechnungen für die Übersicht
  durchgeführt. Die Anwendung ist so aufgebaut, dass sie später
  einfach erweitert werden kann (z. B. API‑Anbindung).
*/

// Definition der standardmäßigen Kategorien mit Farben zur
// Visualisierung. Diese Struktur kann später problemlos erweitert
// werden, ohne dass der Rest der Anwendung angepasst werden muss.
const categories = [
  { name: 'Essen', color: '#ffb74d' },
  { name: 'Hobbys', color: '#90caf9' },
  { name: 'Miete', color: '#a5d6a7' },
  { name: 'Sparen', color: '#fff176' },
  { name: 'Verträge', color: '#81c784' },
  { name: 'Sonstiges', color: '#ce93d8' },
];

// Globale State‑Variable. Alle Eingaben des Nutzers werden hier
// gesammelt und in localStorage persistiert. Dadurch bleiben die
// Daten beim Neuladen der Seite erhalten.
let state = {
  netIncome: 0,
  fixedCosts: [],
  categoryBudgets: {},
  incomes: [],
  expenses: [],
  darkMode: false,
};

// IDs für neue Einträge. Diese werden erhöht, um eindeutige IDs
// innerhalb der Arrays zu erzeugen. Beim Laden aus localStorage
// werden sie entsprechend angepasst.
let nextId = 1;

// Hilfsfunktion zum Laden des gespeicherten Zustands aus dem
// localStorage. Ist noch kein Zustand vorhanden, wird der
// Standardzustand verwendet.
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('plannerData'));
    if (saved && typeof saved === 'object') {
      state = {
        netIncome: saved.netIncome || 0,
        fixedCosts: Array.isArray(saved.fixedCosts)
          ? saved.fixedCosts
          : [],
        categoryBudgets: saved.categoryBudgets || {},
        incomes: Array.isArray(saved.incomes) ? saved.incomes : [],
        expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
        darkMode: !!saved.darkMode,
      };
      // Ermittle die höchste verwendete ID, um Überschneidungen zu
      // vermeiden
      const allIds = []
        .concat(state.fixedCosts, state.incomes, state.expenses)
        .map((item) => item.id);
      const maxId = allIds.length > 0 ? Math.max(...allIds) : 0;
      nextId = maxId + 1;
    }
  } catch (e) {
    console.error('Fehler beim Laden der gespeicherten Daten:', e);
  }
}

// Hilfsfunktion zum Speichern des Zustands in localStorage
function saveState() {
  localStorage.setItem('plannerData', JSON.stringify(state));
}

// Formatierungsfunktion für Eurobeträge im deutschen Format
function formatCurrency(amount) {
  return amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Renderfunktionen für die unterschiedlichen Bereiche

function renderNetIncome() {
  const input = document.getElementById('netIncomeInput');
  input.value = state.netIncome !== undefined ? state.netIncome : '';
}

function renderFixedCosts() {
  const list = document.getElementById('fixedCostsList');
  list.innerHTML = '';
  state.fixedCosts.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.dataset.id = item.id;

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'Beschreibung';
    descInput.value = item.description;
    descInput.addEventListener('input', (e) => {
      item.description = e.target.value;
      saveState();
    });

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.min = '0';
    amountInput.step = '0.01';
    amountInput.placeholder = '0,00';
    amountInput.value = item.amount;
    amountInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      item.amount = isNaN(val) ? 0 : val;
      saveState();
      updateSummary();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Entfernen';
    removeBtn.addEventListener('click', () => {
      state.fixedCosts = state.fixedCosts.filter((fc) => fc.id !== item.id);
      saveState();
      renderFixedCosts();
      updateSummary();
    });

    row.appendChild(descInput);
    row.appendChild(amountInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

function renderCategories() {
  const container = document.getElementById('categoriesContainer');
  container.innerHTML = '';
  categories.forEach((cat) => {
    const card = document.createElement('div');
    card.className = 'category-card';

    const header = document.createElement('div');
    header.className = 'category-card-header';
    header.style.backgroundColor = cat.color;
    header.textContent = cat.name;

    const body = document.createElement('div');
    body.className = 'category-card-body';

    const label = document.createElement('label');
    label.htmlFor = `cat-${cat.name}`;
    label.textContent = 'Budget (EUR)';

    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.id = `cat-${cat.name}`;
    input.placeholder = '0,00';
    const val = state.categoryBudgets[cat.name];
    input.value = typeof val === 'number' ? val : '';
    input.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      if (!isNaN(v)) {
        state.categoryBudgets[cat.name] = v;
      } else {
        delete state.categoryBudgets[cat.name];
      }
      saveState();
      updateSummary();
    });

    body.appendChild(label);
    body.appendChild(input);
    card.appendChild(header);
    card.appendChild(body);
    container.appendChild(card);
  });
}

function renderIncomeEntries() {
  const list = document.getElementById('incomeEntriesList');
  list.innerHTML = '';
  state.incomes.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.dataset.id = item.id;

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'Beschreibung';
    descInput.value = item.description;
    descInput.addEventListener('input', (e) => {
      item.description = e.target.value;
      saveState();
    });

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.min = '0';
    amountInput.step = '0.01';
    amountInput.placeholder = '0,00';
    amountInput.value = item.amount;
    amountInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      item.amount = isNaN(val) ? 0 : val;
      saveState();
      updateSummary();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Entfernen';
    removeBtn.addEventListener('click', () => {
      state.incomes = state.incomes.filter((inc) => inc.id !== item.id);
      saveState();
      renderIncomeEntries();
      updateSummary();
    });

    row.appendChild(descInput);
    row.appendChild(amountInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

function renderExpenseEntries() {
  const list = document.getElementById('expenseEntriesList');
  list.innerHTML = '';
  state.expenses.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.dataset.id = item.id;

    const descInput = document.createElement('input');
    descInput.type = 'text';
    descInput.placeholder = 'Beschreibung';
    descInput.value = item.description;
    descInput.addEventListener('input', (e) => {
      item.description = e.target.value;
      saveState();
    });

    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.min = '0';
    amountInput.step = '0.01';
    amountInput.placeholder = '0,00';
    amountInput.value = item.amount;
    amountInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      item.amount = isNaN(val) ? 0 : val;
      saveState();
      updateSummary();
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Entfernen';
    removeBtn.addEventListener('click', () => {
      state.expenses = state.expenses.filter((exp) => exp.id !== item.id);
      saveState();
      renderExpenseEntries();
      updateSummary();
    });

    row.appendChild(descInput);
    row.appendChild(amountInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
  });
}

// Funktion zum Aktualisieren der Zusammenfassung
function updateSummary() {
  const net = parseFloat(state.netIncome) || 0;
  const fixedTotal = state.fixedCosts.reduce((sum, fc) => sum + (parseFloat(fc.amount) || 0), 0);
  const incomesTotal = state.incomes.reduce((sum, inc) => sum + (parseFloat(inc.amount) || 0), 0);
  const expensesTotal = state.expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);
  const budgetsTotal = categories.reduce((sum, cat) => {
    const val = state.categoryBudgets[cat.name];
    return sum + (typeof val === 'number' && !isNaN(val) ? val : 0);
  }, 0);

  const remaining = net + incomesTotal - fixedTotal - expensesTotal - budgetsTotal;

  document.getElementById('summaryNetIncome').innerHTML = `${formatCurrency(net)}&nbsp;€`;
  document.getElementById('summaryFixedCosts').innerHTML = `${formatCurrency(fixedTotal)}&nbsp;€`;
  document.getElementById('summaryIncomes').innerHTML = `${formatCurrency(incomesTotal)}&nbsp;€`;
  document.getElementById('summaryExpenses').innerHTML = `${formatCurrency(expensesTotal)}&nbsp;€`;
  document.getElementById('summaryBudgets').innerHTML = `${formatCurrency(budgetsTotal)}&nbsp;€`;
  const remElem = document.getElementById('summaryRemaining');
  remElem.innerHTML = `${formatCurrency(remaining)}&nbsp;€`;
  remElem.style.color = remaining < 0 ? '#c62828' : 'inherit';
}

// Dark/Light Mode umschalten
function updateTheme() {
  const body = document.body;
  if (state.darkMode) {
    body.setAttribute('data-theme', 'dark');
    document.getElementById('themeToggle').textContent = '☀️';
  } else {
    body.removeAttribute('data-theme');
    document.getElementById('themeToggle').textContent = '🌙';
  }
}

// Eventregistrierung für Buttons und Inputs
function registerEventHandlers() {
  // Nettoeinkommen Input
  document.getElementById('netIncomeInput').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    state.netIncome = isNaN(val) ? 0 : val;
    saveState();
    updateSummary();
  });

  // Fixkosten hinzufügen
  document.getElementById('addFixedCostBtn').addEventListener('click', () => {
    state.fixedCosts.push({ id: nextId++, description: '', amount: 0 });
    saveState();
    renderFixedCosts();
    updateSummary();
  });

  // Einnahme hinzufügen
  document.getElementById('addIncomeEntryBtn').addEventListener('click', () => {
    state.incomes.push({ id: nextId++, description: '', amount: 0 });
    saveState();
    renderIncomeEntries();
    updateSummary();
  });

  // Ausgabe hinzufügen
  document.getElementById('addExpenseEntryBtn').addEventListener('click', () => {
    state.expenses.push({ id: nextId++, description: '', amount: 0 });
    saveState();
    renderExpenseEntries();
    updateSummary();
  });

  // Dark/Light Toggle
  document.getElementById('themeToggle').addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    saveState();
    updateTheme();
  });
}

// Initialisierung der Anwendung
function init() {
  loadState();
  renderNetIncome();
  renderFixedCosts();
  renderCategories();
  renderIncomeEntries();
  renderExpenseEntries();
  updateSummary();
  updateTheme();
  registerEventHandlers();
}

// Initialisierung starten, sobald das DOM geladen ist
document.addEventListener('DOMContentLoaded', init);