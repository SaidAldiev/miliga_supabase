import React, { useState, useEffect, useRef } from 'react'; // already has useState
import { api } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import LeaderboardRow from '@/components/standings/LeaderboardRow';
import DetailedStats from '@/components/standings/DetailedStats';

export default function Standings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [matchTypeTab, setMatchTypeTab] = useState('doubles'); // 'doubles' | 'singles'
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const contentRef = useRef(null);

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    api.auth.me().then(u => setActiveGroupId(u?.activeGroupId || null)).catch(() => {});
  }, []);

  const { data: matches, isLoading: matchesLoading, refetch } = useQuery({
    queryKey: ['completedMatches', activeGroupId],
    queryFn: () => activeGroupId
      ? api.entities.Match.filter({ status: 'completed', group_id: activeGroupId })
      : api.entities.Match.filter({ status: 'completed' }),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (navigator.vibrate) navigator.vibrate(30);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Pull to refresh handlers
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (contentRef.current?.scrollTop === 0) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (pullStartY > 0 && contentRef.current?.scrollTop === 0) {
        const distance = e.touches[0].clientY - pullStartY;
        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 80) {
        handleRefresh();
      }
      setPullStartY(0);
      setPullDistance(0);
    };

    const ref = contentRef.current;
    if (ref) {
      ref.addEventListener('touchstart', handleTouchStart);
      ref.addEventListener('touchmove', handleTouchMove);
      ref.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (ref) {
        ref.removeEventListener('touchstart', handleTouchStart);
        ref.removeEventListener('touchmove', handleTouchMove);
        ref.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pullStartY, pullDistance]);

  // Resolve a stable identity key + display name from a player ref or fallback name string
  // Key is player_id when available (survives name changes), else lowercased name
  const resolvePlayer = (ref, fallbackName) => {
    if (ref?.player_id) return { key: `id:${ref.player_id}`, displayName: ref.name_at_time };
    const name = ref?.name_at_time || fallbackName || '';
    return { key: `name:${name.toLowerCase().trim()}`, displayName: name };
  };

  const calculateLeaderboard = (matchTypeFilter) => {
    if (!matches) return [];
    // Filter by match type; old matches without match_type default to 'doubles'
    const filteredMatches = matches.filter(m => (m.match_type || 'doubles') === matchTypeFilter);

    const playerStats = {};
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const sortedMatches = [...filteredMatches].sort((a, b) =>
      new Date(a.created_date) - new Date(b.created_date)
    );

    sortedMatches.forEach(match => {
      // Build unified player list using refs when available, fallback to name strings
      const team1Entries = (match.team1_player_refs?.length ? match.team1_player_refs : (match.team1_players || []).map(n => ({ player_id: null, name_at_time: n })))
        .map((ref, i) => resolvePlayer(ref, match.team1_players?.[i]));
      const team2Entries = (match.team2_player_refs?.length ? match.team2_player_refs : (match.team2_players || []).map(n => ({ player_id: null, name_at_time: n })))
        .map((ref, i) => resolvePlayer(ref, match.team2_players?.[i]));

      const allEntries = [
        ...team1Entries.map(e => ({ ...e, team: 'team1' })),
        ...team2Entries.map(e => ({ ...e, team: 'team2' })),
      ];

      allEntries.forEach(({ key, displayName, team }) => {
        if (!key || displayName === '') return;

        if (!playerStats[key]) {
          playerStats[key] = {
            nickname: displayName,
            full_name: displayName,
            matches_played: 0,
            matches_won: 0,
            total_points_scored: 0,
            biggestWin: null,
            currentStreak: 0,
            longestWinStreak: 0,
            longestUnbeatenRun: 0,
            tempWinStreak: 0,
            tempUnbeatenStreak: 0,
            weeklyWins: 0,
            weeklyLosses: 0,
            results: []
          };
        }

        const stats = playerStats[key];
        // Always use the most recent display name (name_at_time of latest match)
        stats.nickname = displayName;
        stats.full_name = displayName;
        stats.matches_played += 1;

        const won = match.winner === team;
        const draw = !match.winner;

        stats.results.push(won ? 'W' : draw ? 'D' : 'L');

        const matchDate = new Date(match.created_date);

        if (won) {
          stats.matches_won += 1;
          stats.tempWinStreak += 1;
          stats.tempUnbeatenStreak += 1;

          const scoreDiff = team === 'team1'
            ? match.team1_sets - match.team2_sets
            : match.team2_sets - match.team1_sets;
          if (!stats.biggestWin || scoreDiff > stats.biggestWin) stats.biggestWin = `${scoreDiff}-0`;
          if (matchDate >= weekAgo) stats.weeklyWins += 1;
        } else if (!draw) {
          stats.tempWinStreak = 0;
          stats.tempUnbeatenStreak = 0;
          if (matchDate >= weekAgo) stats.weeklyLosses += 1;
        } else {
          stats.tempWinStreak = 0;
          stats.tempUnbeatenStreak += 1;
        }

        if (stats.tempWinStreak > stats.longestWinStreak) stats.longestWinStreak = stats.tempWinStreak;
        if (stats.tempUnbeatenStreak > stats.longestUnbeatenRun) stats.longestUnbeatenRun = stats.tempUnbeatenStreak;

        stats.total_points_scored += team === 'team1'
          ? (match.total_points_team1 || 0)
          : (match.total_points_team2 || 0);
      });
    });

    Object.values(playerStats).forEach(stats => {
      let currentStreak = 0;
      for (let i = stats.results.length - 1; i >= 0; i--) {
        if (stats.results[i] === 'W') currentStreak++;
        else if (stats.results[i] === 'L') { currentStreak = -currentStreak; break; }
        else break;
      }
      stats.currentStreak = currentStreak;
    });

    return Object.values(playerStats).sort((a, b) => {
      if (b.matches_won !== a.matches_won) return b.matches_won - a.matches_won;
      const aRate = a.matches_played > 0 ? a.matches_won / a.matches_played : 0;
      const bRate = b.matches_played > 0 ? b.matches_won / b.matches_played : 0;
      return bRate - aRate;
    });
  };

  const leaderboard = calculateLeaderboard(matchTypeTab);

  // Get current user's detailed stats
  const userStats = user ? leaderboard.find(p => 
    p.nickname.toLowerCase().includes(user.email?.toLowerCase()) ||
    p.nickname.toLowerCase().includes(user.nickname?.toLowerCase())
  ) : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white"
      ref={contentRef}
    >
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 transition-all"
          style={{ 
            height: `${Math.min(pullDistance, 80)}px`,
            opacity: pullDistance / 80
          }}
        >
          <RefreshCw className={`w-6 h-6 text-lime-400 ${pullDistance > 80 ? 'animate-spin' : ''}`} />
        </div>
      )}
      
      <div className="max-w-lg mx-auto px-4 py-6 pb-24" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Standings</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Match type tabs */}
        <div className="flex gap-2 mb-6">
          {['doubles', 'singles'].map(t => (
            <button
              key={t}
              onClick={() => setMatchTypeTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                matchTypeTab === t
                  ? 'bg-lime-400 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Your Detailed Stats */}
        {userStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Your Performance</h3>
            <DetailedStats playerStats={userStats} />
          </motion.div>
        )}

        {/* Ad Space */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 h-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex items-center justify-center shadow-lg"
        >
          <span className="text-slate-600 text-sm">Ad Space</span>
        </motion.div>

        {/* Leaderboard */}
        {matchesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-20 rounded-2xl bg-slate-800/50" />
            ))}
          </div>
        ) : leaderboard.length > 0 ? (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {leaderboard.map((player, idx) => (
              <LeaderboardRow 
                key={player.nickname} 
                rank={idx + 1} 
                player={player}
                index={idx}
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 mb-2">No standings yet</p>
            <p className="text-slate-500 text-sm">Complete some matches to build the leaderboard!</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}