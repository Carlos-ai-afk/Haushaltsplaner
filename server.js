const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(TASKS_FILE)) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks: [] }, null, 2));
  }
}

function readTasks() {
  ensureDataFile();
  const fileContent = fs.readFileSync(TASKS_FILE, 'utf8');

  try {
    const parsed = JSON.parse(fileContent);
    if (Array.isArray(parsed.tasks)) {
      return parsed.tasks;
    }
  } catch {
    // Bei ungültiger JSON-Struktur wird unten ein leeres Array zurückgegeben.
  }

  return [];
}

function writeTasks(tasks) {
  ensureDataFile();
  fs.writeFileSync(TASKS_FILE, JSON.stringify({ tasks }, null, 2));
}

function normalizeTask(input) {
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const department =
    typeof input.department === 'string' ? input.department.trim() : '';
  const assignees = Array.isArray(input.assignees)
    ? input.assignees
        .map((person) => (typeof person === 'string' ? person.trim() : ''))
        .filter(Boolean)
    : [];

  return { title, department, assignees };
}

function resetDoneTasksIfNewDay(tasks) {
  const today = new Date().toISOString().slice(0, 10);
  let changed = false;

  const updated = tasks.map((task) => {
    const taskDate =
      typeof task.lastResetDate === 'string' ? task.lastResetDate : today;

    if (taskDate !== today && task.done) {
      changed = true;
      return { ...task, done: false, lastResetDate: today };
    }

    if (taskDate !== today) {
      changed = true;
      return { ...task, lastResetDate: today };
    }

    return task;
  });

  if (changed) {
    writeTasks(updated);
  }

  return updated;
}

app.get('/api/tasks', (req, res) => {
  const tasks = resetDoneTasksIfNewDay(readTasks());
  res.json({ tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title, assignees, department } = normalizeTask(req.body);

  if (!title || assignees.length === 0 || !department) {
    return res.status(400).json({
      message:
        'title, department und mindestens ein assignee werden benötigt.',
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const newTask = {
    id: crypto.randomUUID(),
    title,
    assignees,
    department,
    done: false,
    createdAt: new Date().toISOString(),
    lastResetDate: today,
  };

  const tasks = readTasks();
  tasks.push(newTask);
  writeTasks(tasks);

  res.status(201).json({ task: newTask });
});

app.patch('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const id = req.params.id;
  const taskIndex = tasks.findIndex((task) => task.id === id);

  if (taskIndex === -1) {
    return res.status(404).json({ message: 'Task nicht gefunden.' });
  }

  const current = tasks[taskIndex];
  const done = typeof req.body.done === 'boolean' ? req.body.done : current.done;

  tasks[taskIndex] = {
    ...current,
    done,
    updatedAt: new Date().toISOString(),
  };

  writeTasks(tasks);
  res.json({ task: tasks[taskIndex] });
});

app.delete('/api/tasks/:id', (req, res) => {
  const tasks = readTasks();
  const filtered = tasks.filter((task) => task.id !== req.params.id);

  if (filtered.length === tasks.length) {
    return res.status(404).json({ message: 'Task nicht gefunden.' });
  }

  writeTasks(filtered);
  res.status(204).end();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
