import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";
import ScoreDisplay from './ScoreDisplay';

export default function TeamScore({ 
  teamName, 
  players, 
  sets, 
  games, 
  points, 
  isServing,
  onScorePoint,
  color = "blue",
  disabled = false
}) {
  const colorClasses = {
    blue: {
      bg: "from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600",
      glow: "shadow-blue-500/25",
      border: "border-blue-400/20"
    },
    orange: {
      bg: "from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500",
      glow: "shadow-orange-500/25",
      border: "border-orange-400/20"
    },
    emerald: {
      bg: "from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500",
      glow: "shadow-emerald-400/30",
      border: "border-emerald-400/20"
    },
    lime: {
      bg: "from-lime-400 to-yellow-400 hover:from-lime-300 hover:to-yellow-300",
      glow: "shadow-lime-400/30",
      border: "border-lime-400/20"
    }
  };

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onScorePoint}
      disabled={disabled}
      className={cn(
        "relative flex-1 p-6 rounded-3xl transition-all duration-300",
        "bg-gradient-to-br border backdrop-blur-sm",
        "focus:outline-none focus:ring-2 focus:ring-white/20",
        colorClasses[color].bg,
        colorClasses[color].border,
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer shadow-2xl " + colorClasses[color].glow
      )}
    >
      {/* Serving indicator */}
      {isServing && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 flex items-center gap-2"
        >
          <span className="text-xs font-medium text-white/70 uppercase tracking-wider">Serving</span>
          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shadow-lg shadow-yellow-400/50" />
        </motion.div>
      )}

      {/* Team name */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white truncate">{teamName}</h3>
        <p className="text-sm text-white/60 truncate">
          {players?.join(' & ') || 'Players'}
        </p>
      </div>

      {/* Score display */}
      <div className="flex items-center justify-center gap-4">
        <ScoreDisplay value={sets} label="Sets" color={color} />
        <ScoreDisplay value={games} label="Games" color={color} />
        <ScoreDisplay value={points} label="Points" color={color} isServing={isServing} />
      </div>

      {/* Tap hint */}
      {!disabled && (
        <p className="mt-4 text-xs text-white/40 uppercase tracking-wider">
          Tap to score point
        </p>
      )}
    </motion.button>
  );
}