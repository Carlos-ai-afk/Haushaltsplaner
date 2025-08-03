/*
  Basisserver für die Haushaltsplan‑Anwendung. Er nutzt Express,
  um statische Dateien aus dem Ordner `public` bereitzustellen und
  stellt bereits vorbereitete API‑Routen bereit, die später an
  Datenbanken oder externe Services angebunden werden können. Das
  Backend speichert derzeit keine Daten permanent – alle Daten
  werden im Frontend via localStorage verwaltet. Diese Struktur
  erleichtert jedoch die spätere Umstellung auf eine echte
  Datenpersistenz.
*/

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Aktiviert das Parsen von JSON‑Body für spätere API‑Anfragen
app.use(express.json());

// Statische Dateien (HTML, CSS, JS) aus dem Ordner `public` bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

/*
  Beispielhafte API‑Endpunkte – hier nur Platzhalter. Sie geben
  jeweils eine 501 (Not Implemented) zurück. Später können diese
  mit echter Logik verbunden werden, z. B. Datenbankzugriff oder
  Integration einer externen API wie FinAPI oder Tink.
*/

app.get('/api/budgets', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.post('/api/budgets', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.get('/api/incomes', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.post('/api/incomes', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.get('/api/expenses', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

app.post('/api/expenses', (req, res) => {
  res.status(501).json({ message: 'Not implemented yet' });
});

// Starte den Server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});