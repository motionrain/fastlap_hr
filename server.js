const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

// Hier definieren wir den Log-Ordner für den Simulator / die Runden
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)){
    fs.mkdirSync(logsDir);
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Hilfsfunktion: Rundenzeit in Tagesdatei (JSON) speichern
function saveLapToLog(lapData) {
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  const logFilePath = path.join(logsDir, `${today}.json`);
  
  let logs = [];
  if (fs.existsSync(logFilePath)) {
    try {
      const fileData = fs.readFileSync(logFilePath, 'utf8');
      logs = JSON.parse(fileData);
    } catch (err) {
      console.error("Fehler beim Lesen der Tagesdatei:", err);
    }
  }
  
  logs.push(lapData);
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
}

// --- WEBSOCKET & MULTI-WINDOW SYNC ---
io.on('connection', (socket) => {
  console.log('Ein Client (Frontend/Fenster) hat sich verbunden. ID:', socket.id);

  // 1. Live-Rangliste / Fahrer-Sync für Zuschaueranzeige und weitere Fenster
  socket.on('updateRanking', (data) => {
    // Verteilt die aktuellen Daten sofort an alle Bildschirme/Fenster im System
    io.emit('updateRanking', data);
  });

  // 2. VORSORGE: Generischer Event-Dispatcher für zukünftige Fenster & Steuerungen
  // Egal welches Modul (z.B. Startampel, Rennmodus, Sound, Strafen) etwas sendet:
  socket.on('clientAction', (payload) => {
    console.log(`[ACTION] Empfangen von ${socket.id}:`, payload);
    // An alle anderen oder alle Clients weiterleiten
    io.emit('serverAction', payload);
  });

  socket.on('disconnect', () => {
    console.log('Client getrennt. ID:', socket.id);
  });
});

// --- TRANSPONDER SIMULATOR ---
// Simuliert alle paar Sekunden ein vorbeifahrendes Kart
const simulatedKarts = [
  { kartNumber: 10, driverName: "Hans Richter", transponderId: "TR-5001" },
  { kartNumber: 5, driverName: "Testfahrer Alex", transponderId: "TR-5002" },
  { kartNumber: 12, driverName: "Gerhard Binder", transponderId: "TR-5003" }
];

setInterval(() => {
  // Zufälliges Kart auswählen
  const randomKart = simulatedKarts[Math.floor(Math.random() * simulatedKarts.length)];
  
  const lapData = {
    ...randomKart,
    timestamp: new Date().toISOString()
  };

  console.log(`[SIMULATOR] Kart #${lapData.kartNumber} (${lapData.driverName}) hat die Schleife passiert!`);

  // In Tagesdatei sichern
  saveLapToLog(lapData);

  // An alle verbundenen Browser/Frontends per WebSocket senden
  io.emit('newLap', lapData);

}, 4000); // Alle 4 Sekunden ein simuliertes Signal

// Server starten
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`FastLap-HR Backend läuft auf http://localhost:${PORT}`);
});