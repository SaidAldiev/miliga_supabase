import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function LeaderboardRow({ rank, player, index }) {
  const winRate = player.matches_played > 0 
    ? Math.round((player.matches_won / player.matches_played) * 100) 
    : 0;

  const getMedalColor = (rank) => {
    if (rank === 1) return "from-yellow-400 to-amber-500 text-amber-900";
    if (rank === 2) return "from-slate-300 to-slate-400 text-slate-700";
    if (rank === 3) return "from-orange-400 to-orange-500 text-orange-900";
    return "from-slate-600 to-slate-700 text-slate-300";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "flex items-center gap-4 p-4 rounded-2xl",
        "bg-slate-800/50 border border-slate-700/50",
        "hover:bg-slate-800/70 transition-colors",
        rank <= 3 && "border-l-4",
        rank === 1 && "border-l-yellow-400",
        rank === 2 && "border-l-slate-400",
        rank === 3 && "border-l-orange-400"
      )}
    >
      {/* Rank */}
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg bg-gradient-to-br",
        getMedalColor(rank)
      )}>
        {rank <= 3 ? (
          <Trophy className="w-5 h-5" />
        ) : (
          rank
        )}
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-10 h-10 border-2 border-slate-600">
          <AvatarImage src={player.avatar_url} />
          <AvatarFallback className="bg-slate-700 text-white">
            {(player.nickname || player.full_name || player.email)?.[0]?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">
            {player.nickname || player.full_name || player.email?.split('@')[0]}
          </p>
          <p className="text-xs text-slate-500">
            {player.matches_played} matches
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right">
        <p className="font-bold text-white">{player.matches_won} W</p>
        <p className={cn(
          "text-sm font-medium",
          winRate >= 50 ? "text-lime-300" : "text-yellow-300"
        )}>
          {winRate}%
        </p>
      </div>
    </motion.div>
  );
}