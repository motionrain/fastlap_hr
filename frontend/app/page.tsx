'use client';

import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:4000');

interface LapData {
  kartNumber: number;
  driverName: string;
  transponderId: string;
  timestamp: string;
}

interface DriverStats {
  kartNumber: number;
  driverName: string;
  lapsCount: number;
  bestLap: string;
  lastLap: string;
  speed: number;
  totalTime: string;
}

export default function FastLapDashboard() {
  const [laps, setLaps] = useState<LapData[]>([]);
  const [raceActive, setRaceActive] = useState(false);
  const [raceTime, setRaceTime] = useState(0);

  const [raceMode, setRaceMode] = useState<'minuten' | 'runden'>('minuten');
  const [targetValue, setTargetValue] = useState<number>(8);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempName, setTempName] = useState('');

  const [windows, setWindows] = useState({
    ampel: true,
    stats: true,
    ranking: true,
    einstellungen: true,
  });

  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (raceActive) {
      interval = setInterval(() => {
        setRaceTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [raceActive]);

  useEffect(() => {
    socket.on('newLap', (lapData: LapData) => {
      if (raceActive) {
        setLaps((prevLaps) => [lapData, ...prevLaps]);
      }
    });

    return () => {
      socket.off('newLap');
    };
  }, [raceActive]);

  // HIER IST DER WICHTIGE BLOCK: Sendet die Daten direkt an den Server für die Zuschaueranzeige
  useEffect(() => {
    const driverMap = new Map<number, DriverStats>();

    laps.forEach((lap) => {
      if (!driverMap.has(lap.kartNumber)) {
        driverMap.set(lap.kartNumber, {
          kartNumber: lap.kartNumber,
          driverName: lap.driverName,
          lapsCount: 0,
          bestLap: '0:02.15',
          lastLap: '0:03.45',
          speed: 55,
          totalTime: '01:30'
        });
      }
      const driver = driverMap.get(lap.kartNumber)!;
      driver.lapsCount += 1;
      driver.driverName = lap.driverName;
    });

    const formattedDrivers = Array.from(driverMap.values());
    socket.emit('updateRanking', formattedDrivers);
  }, [laps]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleWindow = (winKey: keyof typeof windows) => {
    setWindows((prev) => ({ ...prev, [winKey]: !prev[winKey] }));
    setActiveMenu(null);
  };

  const saveDriverName = (index: number) => {
    const updatedLaps = [...laps];
    updatedLaps[index].driverName = tempName;
    setLaps(updatedLaps);
    setEditingIndex(null);
  };

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-slate-200 font-mono select-none flex flex-col">
      
      {/* MENÜLEISTE */}
      <nav className="bg-[#121316] border-b border-slate-800 px-4 py-1.5 flex items-center space-x-6 text-xs relative z-50">
        <div className="font-bold text-slate-100 uppercase tracking-widest text-[11px] pr-2 border-r border-slate-800">
          FastLap-HR
        </div>

        <div className="relative">
          <button onClick={() => setActiveMenu(activeMenu === 'rennen' ? null : 'rennen')} className="hover:bg-slate-800/80 px-2.5 py-1 rounded text-slate-300">Rennen</button>
          {activeMenu === 'rennen' && (
            <div className="absolute left-0 mt-1 w-56 bg-[#18191d] border border-slate-800 rounded-lg shadow-2xl py-1 text-xs">
              <button onClick={() => { setRaceActive(true); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between">
                <span>Rennen starten</span>
              </button>
              <button onClick={() => { setRaceActive(false); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between">
                <span>Rennen beenden</span>
              </button>
              <div className="border-t border-slate-800 my-1"></div>
              <button onClick={() => { window.open('/zuschauer', '_blank'); setActiveMenu(null); }} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-amber-400 font-bold">
                Zuschaueranzeige öffnen ↗
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => setActiveMenu(activeMenu === 'ansicht' ? null : 'ansicht')} className="hover:bg-slate-800/80 px-2.5 py-1 rounded text-slate-200 font-bold">Fenster ▾</button>
          {activeMenu === 'ansicht' && (
            <div className="absolute left-0 mt-1 w-52 bg-[#18191d] border border-slate-800 rounded-lg shadow-2xl py-1 text-xs">
              <button onClick={() => toggleWindow('ampel')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between"><span>Startampel</span><span>{windows.ampel ? '✓' : ''}</span></button>
              <button onClick={() => toggleWindow('stats')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between"><span>Session Stats</span><span>{windows.stats ? '✓' : ''}</span></button>
              <button onClick={() => toggleWindow('ranking')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between"><span>Live-Rangliste</span><span>{windows.ranking ? '✓' : ''}</span></button>
              <button onClick={() => toggleWindow('einstellungen')} className="w-full text-left px-4 py-2 hover:bg-slate-800 text-slate-300 flex justify-between"><span>Rennoptionen</span><span>{windows.einstellungen ? '✓' : ''}</span></button>
            </div>
          )}
        </div>
      </nav>

      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-center m-6 mb-4 bg-[#121316] border border-slate-800/80 p-5 rounded-2xl shadow-xl gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center shadow-lg">
            <span className="text-amber-400 font-black text-xl">🏁</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-wider uppercase text-white flex items-center gap-2">
              FASTLAP <span className="text-amber-500 font-light">HR</span>
            </h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase font-semibold">
              KaRaS Edition • Admin Leitstand & Rennsteuerung
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="bg-[#18191d] px-4 py-2 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Ziel: {targetValue} {raceMode === 'minuten' ? 'Min' : 'Rnd'}</span>
            <span className="text-xl font-bold text-slate-100">{formatTime(raceTime)}</span>
          </div>

          <div className="flex space-x-3">
            {!raceActive ? (
              <button onClick={() => setRaceActive(true)} className="bg-slate-200 hover:bg-white text-slate-950 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-lg active:scale-95">
                ▶ Rennen Starten
              </button>
            ) : (
              <button onClick={() => setRaceActive(false)} className="bg-red-950/80 hover:bg-red-900 border border-red-800/50 text-red-200 px-6 py-2.5 rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-lg active:scale-95">
                ■ Rennen Beenden
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD */}
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow">
        
        <div className="space-y-6 lg:col-span-1">
          {windows.einstellungen && (
            <div className="bg-[#121316] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-[#18191d]/60 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">⚙️ Rennoptionen</span>
                <button onClick={() => toggleWindow('einstellungen')} className="text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <div className="p-4 text-xs space-y-3 font-sans">
                <div>
                  <label className="text-slate-400 block mb-1">Modus wählen:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setRaceMode('minuten')}
                      className={`py-2 rounded font-bold border transition-all ${raceMode === 'minuten' ? 'bg-slate-200 text-slate-950 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                      Zeit (Min)
                    </button>
                    <button 
                      onClick={() => setRaceMode('runden')}
                      className={`py-2 rounded font-bold border transition-all ${raceMode === 'runden' ? 'bg-slate-200 text-slate-950 border-slate-200' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                    >
                      Runden
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">
                    {raceMode === 'minuten' ? 'Renndauer in Minuten:' : 'Anzahl der Runden:'}
                  </label>
                  <input 
                    type="number" 
                    value={targetValue} 
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    className="w-full bg-[#18191d] border border-slate-700 px-3 py-2 rounded text-white font-mono outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {windows.ampel && (
            <div className="bg-[#121316] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-[#18191d]/60 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">🚦 Startampel</span>
                <button onClick={() => toggleWindow('ampel')} className="text-slate-500 hover:text-slate-300">✕</button>
              </div>
              <div className="p-5 flex flex-col items-center bg-[#0d0e11]">
                <div className="flex space-x-3 mb-4">
                  <div className={`w-7 h-7 rounded-full transition-all duration-300 ${raceActive ? 'bg-slate-900 border border-slate-800' : 'bg-red-600 shadow-[0_0_12px_rgba(220,38,38,0.5)] border border-red-500'}`}></div>
                  <div className={`w-7 h-7 rounded-full transition-all duration-300 ${raceActive ? 'bg-slate-900 border border-slate-800' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)] border border-amber-400'}`}></div>
                  <div className={`w-7 h-7 rounded-full transition-all duration-300 ${raceActive ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] border border-emerald-400' : 'bg-slate-900 border border-slate-800'}`}></div>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider">
                  {raceActive ? "● AMPEL GRÜN" : "○ BEREIT"}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 space-y-6">
          {windows.ranking && (
            <div className="bg-[#121316] border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="bg-[#18191d]/60 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-300 uppercase tracking-wider">⏱️ Admin Live-Rangliste (Fahrer umbenennbar)</span>
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded border border-slate-700 font-mono">ADMIN PANEL</span>
                  <button onClick={() => toggleWindow('ranking')} className="text-slate-500 hover:text-slate-300">✕</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0d0e11]/50 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800/80">
                      <th className="p-3.5 font-semibold">Kart #</th>
                      <th className="p-3.5 font-semibold">Fahrer (Klicken zum Bearbeiten)</th>
                      <th className="p-3.5 font-semibold">Transponder</th>
                      <th className="p-3.5 font-semibold text-right">Uhrzeit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-sm">
                    {laps.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-10 text-center text-slate-400 font-sans text-xs">
                          {raceActive ? "Warte auf Transponder-Signale..." : "Rennen gestoppt. Starte das Rennen über die Menüleiste."}
                        </td>
                      </tr>
                    ) : (
                      laps.map((lap, index) => (
                        <tr key={index} className="hover:bg-slate-800/20 transition-colors">
                          <td className="p-3.5 font-bold text-slate-100 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            #{lap.kartNumber}
                          </td>
                          <td className="p-3.5 text-slate-300 font-sans font-medium">
                            {editingIndex === index ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={tempName}
                                  onChange={(e) => setTempName(e.target.value)}
                                  className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-white text-xs font-mono outline-none focus:border-amber-500"
                                  autoFocus
                                />
                                <button onClick={() => saveDriverName(index)} className="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded text-xs font-bold">✓</button>
                                <button onClick={() => setEditingIndex(null)} className="bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded text-xs">✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between group cursor-pointer" onClick={() => { setEditingIndex(index); setTempName(lap.driverName); }}>
                                <span className="underline decoration-slate-700 decoration-dotted underline-offset-4 hover:text-amber-400 transition-colors">{lap.driverName}</span>
                                <span className="text-[10px] text-slate-500 group-hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">✏️ Bearbeiten</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400 text-xs font-mono">{lap.transponderId}</td>
                          <td className="p-3.5 text-right text-slate-400 font-mono text-xs">
                            {new Date(lap.timestamp).toLocaleTimeString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}