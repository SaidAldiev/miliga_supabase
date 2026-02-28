import React from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Trophy, Clock, MapPin, Zap } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MatchCard({ match, onClick }) {
  const isLive = match.status === 'live';
  const team1Won = match.winner === 'team1';
  const team2Won = match.winner === 'team2';

  const sportIcons = {
    padel: '🎾',
    mini_football: '⚽',
    basketball_3x3: '🏀'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative bg-slate-800/20 rounded-2xl p-5 cursor-pointer",
        "border border-white/10 backdrop-blur-xl shadow-xl",
        "transition-all duration-300 hover:border-white/20 hover:bg-slate-800/30",
        isLive && "ring-2 ring-green-500/20 border-green-500/20"
      )}
    >
      {/* Status badge */}
      <div className="absolute top-4 right-4">
        {isLive ? (
          <Badge className="bg-lime-400/15 text-lime-300 border-lime-400/30 backdrop-blur-xl animate-pulse">
            <Zap className="w-3 h-3 mr-1" />
            LIVE
          </Badge>
        ) : (
          <Badge variant="outline" className="text-slate-400 border-white/10 backdrop-blur-xl bg-white/5">
            {format(new Date(match.completed_at || match.created_date), 'MMM d')}
          </Badge>
        )}
      </div>

      {/* Sport icon */}
      <div className="text-2xl mb-3">{sportIcons[match.sport]}</div>

      {/* Teams */}
      <div className="space-y-3">
        {/* Team 1 */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl transition-colors backdrop-blur-xl",
          team1Won ? "bg-emerald-500/15 border border-emerald-400/20" : "bg-white/5 border border-white/10"
        )}>
          <div className="flex items-center gap-2 flex-1">
            {team1Won && <Trophy className="w-4 h-4 text-yellow-400" />}
            <span className={cn(
              "font-semibold truncate max-w-[120px]",
              team1Won ? "text-emerald-300" : "text-white"
            )}>
              {match.team1_name || match.team1_players?.join(' & ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {match.set_history && match.set_history.length > 0 && (
              <div className="flex gap-1">
                {match.set_history.map((set, idx) => (
                  <span key={idx} className="text-xs text-slate-400 tabular-nums">
                    {set.team1_games}
                  </span>
                ))}
              </div>
            )}
            <span className="font-bold text-xl text-white tabular-nums min-w-[24px] text-right">{match.team1_sets}</span>
          </div>
        </div>

        {/* Team 2 */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-xl transition-colors backdrop-blur-xl",
          team2Won ? "bg-lime-400/15 border border-lime-400/20" : "bg-white/5 border border-white/10"
        )}>
          <div className="flex items-center gap-2 flex-1">
            {team2Won && <Trophy className="w-4 h-4 text-yellow-400" />}
            <span className={cn(
              "font-semibold truncate max-w-[120px]",
              team2Won ? "text-lime-300" : "text-white"
            )}>
              {match.team2_name || match.team2_players?.join(' & ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {match.set_history && match.set_history.length > 0 && (
              <div className="flex gap-1">
                {match.set_history.map((set, idx) => (
                  <span key={idx} className="text-xs text-slate-400 tabular-nums">
                    {set.team2_games}
                  </span>
                ))}
              </div>
            )}
            <span className="font-bold text-xl text-white tabular-nums min-w-[24px] text-right">{match.team2_sets}</span>
          </div>
        </div>
      </div>

      {/* Location */}
      {match.location && (
        <div className="flex items-center gap-1 mt-3 text-xs text-slate-500">
          <MapPin className="w-3 h-3" />
          {match.location}
        </div>
      )}
    </motion.div>
  );
}