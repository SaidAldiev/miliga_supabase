import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, TrendingUp, Award, Target } from 'lucide-react';

export default function DetailedStats({ playerStats }) {
  if (!playerStats) return null;

  const stats = [
    { 
      icon: Trophy, 
      label: 'Biggest Win', 
      value: playerStats.biggestWin || 'N/A',
      color: 'text-lime-300'
    },
    { 
      icon: Flame, 
      label: 'Current Streak', 
      value: playerStats.currentStreak > 0 ? `${playerStats.currentStreak} W` : `${Math.abs(playerStats.currentStreak)} L`,
      color: playerStats.currentStreak > 0 ? 'text-emerald-300' : 'text-red-400'
    },
    { 
      icon: TrendingUp, 
      label: 'Longest Win Streak', 
      value: playerStats.longestWinStreak || 0,
      color: 'text-yellow-300'
    },
    { 
      icon: Award, 
      label: 'Unbeaten Run', 
      value: playerStats.longestUnbeatenRun || 0,
      color: 'text-lime-300'
    },
    { 
      icon: Target, 
      label: 'This Week', 
      value: `${playerStats.weeklyWins || 0}W - ${playerStats.weeklyLosses || 0}L`,
      color: 'text-emerald-300'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.03 }}
          transition={{ delay: idx * 0.05, duration: 0.2 }}
          className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.color}`} />
            <p className="text-xs text-slate-400">{stat.label}</p>
          </div>
          <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
        </motion.div>
      ))}
    </div>
  );
}