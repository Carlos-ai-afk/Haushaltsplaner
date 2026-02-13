const STORAGE_KEY = 'taskDistributorPreferences';
const TASK_CACHE_KEY = 'taskDistributorCachedTasks';

const taskForm = document.getElementById('taskForm');
const titleInput = document.getElementById('taskTitle');
const assigneesInput = document.getElementById('taskAssignees');
const departmentInput = document.getElementById('taskDepartment');
const openTasksContainer = document.getElementById('openTasks');
const doneTasksContainer = document.getElementById('doneTasks');
const themeToggle = document.getElementById('themeToggle');

let state = {
  tasks: [],
  darkMode: false,
};

function loadPreferences() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    state.darkMode = !!parsed.darkMode;
  } catch {
    state.darkMode = false;
  }
}

function savePreferences() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      darkMode: state.darkMode,
    })
  );
}

function loadCachedTasks() {
  const saved = localStorage.getItem(TASK_CACHE_KEY);
  if (!saved) {
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed)) {
      state.tasks = parsed;
    }
  } catch {
    state.tasks = [];
  }
}

function cacheTasks() {
  localStorage.setItem(TASK_CACHE_KEY, JSON.stringify(state.tasks));
}

function applyTheme() {
  document.documentElement.setAttribute(
    'data-theme',
    state.darkMode ? 'dark' : 'light'
  );
  themeToggle.textContent = state.darkMode ? '☀️' : '🌙';
}

function parseAssignees(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function createStatus(text, isError = false) {
  const p = document.createElement('p');
  p.className = isError ? 'status error' : 'status';
  p.textContent = text;
  return p;
}

function createTaskItem(task) {
  const item = document.createElement('article');
  item.className = 'task-item';

  const textWrap = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';
  meta.innerHTML = `<span class="badge">${task.department}</span>Zuständig: ${task.assignees.join(', ')}`;

  textWrap.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'task-actions';

  const statusButton = document.createElement('button');
  statusButton.className = task.done ? '' : 'done';
  statusButton.textContent = task.done ? 'Auf offen setzen' : 'Erledigt';
  statusButton.addEventListener('click', async () => {
    await updateTaskStatus(task.id, !task.done);
  });

  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Löschen';
  deleteButton.addEventListener('click', async () => {
    await deleteTask(task.id);
  });

  actions.append(statusButton, deleteButton);
  item.append(textWrap, actions);

  return item;
}

function renderTaskList(container, tasks, emptyText) {
  container.innerHTML = '';

  if (tasks.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = emptyText;
    container.appendChild(empty);
    return;
  }

  tasks.forEach((task) => container.appendChild(createTaskItem(task)));
}

function render() {
  const openTasks = state.tasks.filter((task) => !task.done);
  const doneTasks = state.tasks.filter((task) => task.done);

  renderTaskList(openTasksContainer, openTasks, 'Keine offenen Aufgaben.');
  renderTaskList(doneTasksContainer, doneTasks, 'Noch nichts erledigt.');
}

async function fetchTasks() {
  try {
    const response = await fetch('/api/tasks');
    if (!response.ok) {
      throw new Error('Server nicht erreichbar');
    }

    const data = await response.json();
    state.tasks = Array.isArray(data.tasks) ? data.tasks : [];
    cacheTasks();
  } catch {
    // Fallback auf lokal gecachte Daten
    loadCachedTasks();
    openTasksContainer.prepend(
      createStatus('Offline/Fallback: lokale Daten angezeigt.', true)
    );
  }

  render();
}

async function createTask(payload) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Aufgabe konnte nicht erstellt werden.');
  }

  await fetchTasks();
}

async function updateTaskStatus(id, done) {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done }),
  });

  if (!response.ok) {
    throw new Error('Status konnte nicht aktualisiert werden.');
  }

  await fetchTasks();
}

async function deleteTask(id) {
  const response = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Aufgabe konnte nicht gelöscht werden.');
  }

  await fetchTasks();
}

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const department = departmentInput.value;
  const assignees = parseAssignees(assigneesInput.value);

  if (!title || !department || assignees.length === 0) {
    return;
  }

  try {
    await createTask({ title, department, assignees });
    taskForm.reset();
    departmentInput.value = 'WB1';
    titleInput.focus();
  } catch (error) {
    openTasksContainer.prepend(createStatus(error.message, true));
  }
});

themeToggle.addEventListener('click', () => {
  state.darkMode = !state.darkMode;
  savePreferences();
  applyTheme();
});

loadPreferences();
loadCachedTasks();
applyTheme();
render();
fetchTasks();
