import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function PointLog({ match }) {
  const [expanded, setExpanded] = useState(false);

  const pointLog = match?.point_log;
  if (!pointLog || pointLog.length === 0) return null;

  const team1Name = match.team1_name || 'Team 1';
  const team2Name = match.team2_name || 'Team 2';

  // Group by set → game
  const grouped = {};
  pointLog.forEach((entry) => {
    const setKey = entry.set;
    const gameKey = entry.game;
    if (!grouped[setKey]) grouped[setKey] = {};
    if (!grouped[setKey][gameKey]) grouped[setKey][gameKey] = [];
    grouped[setKey][gameKey].push(entry);
  });

  const resultLabel = (result) => {
    if (result === 'match') return '🏆 Match';
    if (result === 'set') return '🎯 Set';
    if (result === 'game') return '🎮 Game';
    return null;
  };

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2 rounded-xl bg-slate-800/40 border border-white/10 text-slate-400 hover:text-white text-sm transition-all"
      >
        <span>Point-by-point overview</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-4">
              {Object.keys(grouped).sort((a,b) => Number(a)-Number(b)).map(setNum => (
                <div key={setNum}>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">Set {setNum}</p>
                  <div className="space-y-2">
                    {Object.keys(grouped[setNum]).sort((a,b) => Number(a)-Number(b)).map(gameNum => {
                      const points = grouped[setNum][gameNum];
                      const gameWinner = points[points.length - 1]?.team;
                      const winnerName = gameWinner === 'team1' ? team1Name : team2Name;
                      return (
                        <div key={gameNum} className="bg-slate-800/30 rounded-xl border border-white/5 overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/40">
                            <span className="text-xs text-slate-400">Game {gameNum}</span>
                            <span className="text-xs text-lime-400 font-medium">{winnerName} wins</span>
                          </div>
                          <div className="px-3 py-2 flex flex-wrap gap-1.5">
                            {points.map((pt, idx) => {
                              const isTeam1 = pt.team === 'team1';
                              const badge = resultLabel(pt.result);
                              return (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                                    ${isTeam1 
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/20' 
                                      : 'bg-lime-400/15 text-lime-300 border border-lime-400/20'}`}
                                >
                                  {isTeam1 ? team1Name : team2Name}
                                  {badge && <span className="text-[10px] opacity-70">{badge}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}