import React, { useState, useEffect } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Trophy, 
  Target, 
  TrendingUp, 
  Flame,
  Award,
  Zap
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import StatCard from '@/components/stats/StatCard';

export default function Statistics() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    api.auth.me().then(u => { setUser(u); setActiveGroupId(u?.activeGroupId || null); }).catch(() => {});
  }, []);

  const { data: matches, isLoading } = useQuery({
    queryKey: ['allMatches', activeGroupId],
    queryFn: () => activeGroupId
      ? api.entities.Match.filter({ status: 'completed', group_id: activeGroupId })
      : api.entities.Match.filter({ status: 'completed' }),
  });

  const { data: playerProfile } = useQuery({
    queryKey: ['myPlayerProfile', user?.email],
    queryFn: () => api.entities.Player.filter({ email: user.email }),
    enabled: !!user?.email,
    select: (res) => res?.[0] || null,
  });

  const calculateStats = (matchTypeFilter) => {
    if (!matches || !user) return null;

    let wins = 0, losses = 0, gamePointsWon = 0, gamePointsConceded = 0;

    const myPlayerId = playerProfile?.id;
    const myPlayerName = playerProfile?.name?.toLowerCase();
    const userIdentifiers = [
      user.email?.toLowerCase(),
      user.full_name?.toLowerCase(),
      myPlayerName,
    ].filter(Boolean);

    const teamContainsMe = (refs, nameFallback) => {
      if (myPlayerId && refs?.some(r => r.player_id === myPlayerId)) return true;
      return (nameFallback || []).some(n =>
        userIdentifiers.some(id => n.toLowerCase() === id || n.toLowerCase().includes(id))
      );
    };

    const filtered = matches.filter(m => (m.match_type || 'doubles') === matchTypeFilter);

    filtered.forEach(match => {
      const isTeam1 = teamContainsMe(match.team1_player_refs, match.team1_players);
      const isTeam2 = teamContainsMe(match.team2_player_refs, match.team2_players);
      if (!isTeam1 && !isTeam2) return;

      if (isTeam1) {
        if (match.winner === 'team1') wins++;
        else if (match.winner === 'team2') losses++;
      } else {
        if (match.winner === 'team2') wins++;
        else if (match.winner === 'team1') losses++;
      }

      if (match.point_log?.length) {
        match.point_log.forEach(entry => {
          const myTeam = isTeam1 ? 'team1' : 'team2';
          if (entry.team === myTeam) gamePointsWon++;
          else gamePointsConceded++;
        });
      } else {
        if (isTeam1) {
          gamePointsWon += match.total_points_team1 || 0;
          gamePointsConceded += match.total_points_team2 || 0;
        } else {
          gamePointsWon += match.total_points_team2 || 0;
          gamePointsConceded += match.total_points_team1 || 0;
        }
      }
    });

    const totalMatches = wins + losses;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    return { wins, losses, totalMatches, winRate, gamePointsWon, gamePointsConceded, pointDifferential: gamePointsWon - gamePointsConceded };
  };

  const doublesStats = calculateStats('doubles');
  const singlesStats = calculateStats('singles');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(createPageUrl('Home'))}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Your Statistics</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-32 rounded-2xl bg-slate-800/50" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {[
              { label: 'Doubles', stats: doublesStats, icon: '👥' },
              { label: 'Singles', stats: singlesStats, icon: '🎾' }
            ].map(({ label, stats, icon }) => (
              <div key={label}>
                <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                  <span>{icon}</span> {label} Performance
                </h2>
                {stats && stats.totalMatches > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <StatCard icon={Trophy} label="Matches Won" value={stats.wins} color="green" delay={0} />
                      <StatCard icon={Target} label="Matches Played" value={stats.totalMatches} color="blue" delay={0.05} />
                      <StatCard icon={TrendingUp} label="Win Rate" value={`${stats.winRate}%`} color={stats.winRate >= 50 ? "lime" : "yellow"} delay={0.1} />
                      <StatCard icon={Flame} label="Losses" value={stats.losses} color="yellow" delay={0.15} />
                    </div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50"
                    >
                      <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Points Breakdown
                      </h3>
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                          <p className="text-2xl font-bold text-emerald-300">{stats.gamePointsWon}</p>
                          <p className="text-xs text-slate-500">Won</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-400">{stats.gamePointsConceded}</p>
                          <p className="text-xs text-slate-500">Conceded</p>
                        </div>
                        <div>
                          <p className={`text-2xl font-bold ${stats.pointDifferential >= 0 ? 'text-lime-300' : 'text-red-400'}`}>
                            {stats.pointDifferential >= 0 ? '+' : ''}{stats.pointDifferential}
                          </p>
                          <p className="text-xs text-slate-500">Differential</p>
                        </div>
                      </div>
                      {stats.gamePointsWon + stats.gamePointsConceded > 0 && (
                        <>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-400 to-lime-400 h-2 rounded-full transition-all"
                              style={{ width: `${Math.round((stats.gamePointsWon / (stats.gamePointsWon + stats.gamePointsConceded)) * 100)}%` }}
                            />
                          </div>
                          <p className="text-center text-xs text-slate-500 mt-1">
                            {Math.round((stats.gamePointsWon / (stats.gamePointsWon + stats.gamePointsConceded)) * 100)}% game points win rate
                          </p>
                        </>
                      )}
                    </motion.div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-800/30 rounded-2xl border border-slate-700/50">
                    <p className="text-slate-500 text-sm">No {label.toLowerCase()} matches yet</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}