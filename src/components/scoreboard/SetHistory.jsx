import React from 'react';
import { motion } from 'framer-motion';

export default function SetHistory({ sets, team1Name, team2Name }) {
  if (!sets || sets.length === 0) return null;

  return (
    <div className="bg-slate-800/50 rounded-2xl p-4 backdrop-blur-sm border border-slate-700/50">
      <h4 className="text-xs uppercase tracking-wider text-slate-400 mb-3 font-medium">Set History</h4>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {sets.map((set, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="flex-shrink-0 bg-slate-900/50 rounded-xl p-3 min-w-[4rem] text-center"
          >
            <span className="text-xs text-slate-500 block mb-1">Set {idx + 1}</span>
            <div className="flex flex-col gap-1">
              <span className={`text-lg font-bold ${set.team1_games > set.team2_games ? 'text-emerald-300' : 'text-slate-400'}`}>
                {set.team1_games}
              </span>
              <div className="h-px bg-slate-700" />
              <span className={`text-lg font-bold ${set.team2_games > set.team1_games ? 'text-lime-300' : 'text-slate-400'}`}>
                {set.team2_games}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}