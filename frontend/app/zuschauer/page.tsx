'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

interface DriverStats {
  kartNumber: number;
  driverName: string;
  lapsCount: number;
  bestLap: string;
  lastLap: string;
  speed: number;
  totalTime: string;
}

export default function ZuschauerAnzeige() {
  const [drivers, setDrivers] = useState<DriverStats[]>([]);
  const [maxRows, setMaxRows] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const pageIntervalSeconds = 4;

  useEffect(() => {
    // Empfängt die exakte Fahrerliste und Rangliste vom Server/Admin-Panel
    socket.on('updateRanking', (updatedDrivers: DriverStats[]) => {
      setDrivers(updatedDrivers);
    });

    return () => {
      socket.off('updateRanking');
    };
  }, []);

  // Automatisches Blättern auf Seite 2, wenn mehr Fahrer als maxRows da sind
  useEffect(() => {
    const totalPages = Math.ceil(drivers.length / maxRows);
    if (totalPages <= 1) {
      setCurrentPage(0);
      return;
    }

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, pageIntervalSeconds * 1000);

    return () => clearInterval(timer);
  }, [drivers.length, maxRows]);

  const startIndex = currentPage * maxRows;
  const pageDrivers = drivers.slice(startIndex, startIndex + maxRows);
  
  const displayRows = [...pageDrivers];
  while (displayRows.length < maxRows) {
    displayRows.push(null as any);
  }

  return (
    <main className="min-h-screen bg-[#08080a] text-slate-100 p-6 font-mono select-none flex flex-col">
      
      {/* HEADER & SETTINGS */}
      <div className="bg-[#121316] text-slate-200 font-bold px-6 py-4 rounded-2xl flex flex-col gap-4 shadow-xl border border-slate-800/80 mb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
              <span className="text-amber-400 font-black text-xl">🏁</span>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider uppercase text-white flex items-center gap-2">
                FASTLAP <span className="text-slate-400 font-light">HR</span>
              </h1>
              <p className="text-xs text-slate-400 tracking-widest uppercase font-semibold">
                Rangliste nach bester Runde • Hallen-Zuschaueranzeige
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs border border-slate-700 transition-colors"
            >
              ⚙️ Settings {showSettings ? '▲' : '▼'}
            </button>
            {drivers.length > maxRows && (
              <div className="text-xs bg-slate-900 text-amber-400 px-3 py-2 rounded-xl border border-slate-800 font-mono">
                Page {currentPage + 1} / {Math.ceil(drivers.length / maxRows)}
              </div>
            )}
            <div className="text-xs bg-[#18191d] text-emerald-400 px-4 py-2 rounded-xl border border-slate-800 font-mono tracking-widest shadow-inner">
              ● LIVE
            </div>
          </div>
        </div>

        {/* Einstellungs-Leiste (10, 12, 15 Zeilen) */}
        {showSettings && (
          <div className="bg-[#18191d] p-4 rounded-xl border border-slate-800 flex items-center gap-6 text-xs">
            <div className="flex items-center gap-3">
              <label className="text-slate-400 font-semibold">Zeilenanzahl auf Bildschirm:</label>
              <select 
                value={maxRows} 
                onChange={(e) => { setMaxRows(Number(e.target.value)); setCurrentPage(0); }}
                className="bg-slate-900 border border-slate-700 text-white px-3 py-1.5 rounded-lg font-mono outline-none focus:border-amber-500"
              >
                <option value={10}>10 Zeilen</option>
                <option value={12}>12 Zeilen (Standard)</option>
                <option value={15}>15 Zeilen</option>
              </select>
            </div>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Aktive Fahrer im Rennen: <strong className="text-white">{drivers.length}</strong></span>
          </div>
        )}
      </div>

      {/* HAUPTTABELLE */}
      <div className="bg-[#121316] text-slate-200 rounded-2xl overflow-hidden shadow-2xl border border-slate-800/80">
        <table className="w-full text-left border-collapse table-fixed">
          <thead>
            <tr className="bg-[#1a1b20] text-slate-400 text-sm uppercase border-b border-slate-800 font-bold tracking-wider h-[46px]">
              <th className="px-4 w-16">Pos</th>
              <th className="px-4 w-24">Nr.</th>
              <th className="px-4">Name</th>
              <th className="px-4 w-24 text-center">Rnd</th>
              <th className="px-4 w-32">Bestzeit</th>
              <th className="px-4 w-32">Last Lap</th>
              <th className="px-4 w-28">km/h</th>
              <th className="px-4 w-32 text-right">Gesamt</th>
            </tr>
          </thead>
          <tbody className="text-base font-bold">
            {displayRows.map((driver, index) => {
              const globalPos = startIndex + index + 1;
              const rowBg = globalPos % 2 !== 0 ? 'bg-[#121316]' : 'bg-[#18191d]';

              if (!driver) {
                return (
                  <tr key={`empty-${index}`} className={`${rowBg} border-b border-slate-800/20 h-[52px]`}>
                    <td colSpan={8} className="px-4 text-slate-700 text-center font-normal">-</td>
                  </tr>
                );
              }

              return (
                <tr key={index} className={`${rowBg} border-b border-slate-800/40 h-[52px] transition-colors`}>
                  <td className="px-4 text-slate-400 font-black">{globalPos}</td>
                  <td className="px-4 text-amber-400 font-black">#{driver.kartNumber}</td>
                  <td className="px-4 text-white font-sans font-bold text-lg truncate">{driver.driverName}</td>
                  <td className="px-4 text-center text-slate-300">{driver.lapsCount}</td>
                  <td className="px-4 text-slate-100 font-mono">{driver.bestLap}</td>
                  <td className="px-4 text-slate-400 font-mono">{driver.lastLap}</td>
                  <td className="px-4 text-slate-300 font-mono">{driver.speed}</td>
                  <td className="px-4 text-right text-slate-100 font-mono">{driver.totalTime}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}