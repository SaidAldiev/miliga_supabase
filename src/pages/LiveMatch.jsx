import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  RotateCcw, 
  Square,
  Trophy,
  Share2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import TeamScore from '@/components/scoreboard/TeamScore';
import SetHistory from '@/components/scoreboard/SetHistory';

// Padel scoring: 0, 15, 30, 40, AD
const POINTS_ORDER = ['0', '15', '30', '40', 'AD'];

export default function LiveMatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const matchId = urlParams.get('id');

  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winner, setWinner] = useState(null);
  const [pointHistory, setPointHistory] = useState([]);
  const [showAdOverlay, setShowAdOverlay] = useState(false);

  const { data: match, isLoading, refetch } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => api.entities.Match.filter({ id: matchId }).then(res => res[0]),
    enabled: !!matchId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Match.update(matchId, data),
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['match', matchId] });
      
      // Snapshot the previous value
      const previousMatch = queryClient.getQueryData(['match', matchId]);
      
      // Optimistically update to the new value
      queryClient.setQueryData(['match', matchId], (old) => ({
        ...old,
        ...newData
      }));
      
      return { previousMatch };
    },
    onError: (err, newData, context) => {
      // Rollback on error
      queryClient.setQueryData(['match', matchId], context.previousMatch);
    },
    onSuccess: () => refetch(),
  });

  // Serving is determined by total games played in current set: team1 serves odd games (1,3,5...), team2 serves even games (2,4,6...)
  // Total games = team1_games + team2_games at start of current game
  const getServingTeam = useCallback((team1Games, team2Games, setHistory) => {
    // Count total games played across all completed sets
    const completedSetGames = (setHistory || []).reduce((acc, s) => acc + s.team1_games + s.team2_games, 0);
    const currentSetGames = team1Games + team2Games;
    const totalGamesPlayed = completedSetGames + currentSetGames;
    // Odd total games played = team2 serves, even = team1 serves (0-indexed: game 1 = 0 total played = team1)
    return totalGamesPlayed % 2 === 0 ? 1 : 2;
  }, []);

  // Derive serving team from match data (no local state needed)
  const servingTeam = match ? getServingTeam(match.team1_games, match.team2_games, match.set_history) : 1;

  // Calculate next point in padel scoring
  const getNextPoint = useCallback((currentPoint, opponentPoint, isDeuce) => {
    if (currentPoint === '40' && opponentPoint === '40') {
      return 'AD';
    }
    if (currentPoint === '40' && opponentPoint === 'AD') {
      return '40'; // Back to deuce
    }
    if (currentPoint === 'AD') {
      return 'WIN';
    }
    if (currentPoint === '40' && POINTS_ORDER.indexOf(opponentPoint) < POINTS_ORDER.indexOf('40')) {
      return 'WIN';
    }
    const currentIdx = POINTS_ORDER.indexOf(currentPoint);
    return POINTS_ORDER[currentIdx + 1] || 'WIN';
  }, []);

  const handleScorePoint = useCallback((team) => {
    if (!match || match.status !== 'live') return;

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Show ad overlay every 5 points
    const totalPoints = (match.total_points_team1 || 0) + (match.total_points_team2 || 0);
    if (totalPoints > 0 && totalPoints % 5 === 0) {
      setShowAdOverlay(true);
      setTimeout(() => setShowAdOverlay(false), 3000);
    }

    // Save current state for undo
    setPointHistory(prev => [...prev, {
      team1_points: match.team1_points,
      team2_points: match.team2_points,
      team1_games: match.team1_games,
      team2_games: match.team2_games,
      team1_sets: match.team1_sets,
      team2_sets: match.team2_sets,
      set_history: match.set_history,
      total_points_team1: match.total_points_team1,
      total_points_team2: match.total_points_team2,
      // NOTE:
      // Base44 previously stored a per-point log (match.point_log). Our Supabase schema
      // does NOT include a `point_log` column, so we must not read/write it.
    }]);

    let newMatch = { ...match };
    const scoringTeam = team === 1 ? 'team1' : 'team2';
    const otherTeam = team === 1 ? 'team2' : 'team1';

    // Update total points
    newMatch[`total_points_${scoringTeam}`] = (newMatch[`total_points_${scoringTeam}`] || 0) + 1;

    const currentPoint = newMatch[`${scoringTeam}_points`];
    const opponentPoint = newMatch[`${otherTeam}_points`];
    
    const nextPoint = getNextPoint(currentPoint, opponentPoint, currentPoint === '40' && opponentPoint === '40');

    if (nextPoint === 'WIN') {
      // Won the game
      newMatch[`${scoringTeam}_games`] += 1;
      newMatch.team1_points = '0';
      newMatch.team2_points = '0';

      // Check for set win
      const scoringGames = newMatch[`${scoringTeam}_games`];
      const opponentGames = newMatch[`${otherTeam}_games`];
      
      const wonSet = (scoringGames >= 6 && scoringGames - opponentGames >= 2) ||
                     (scoringGames === 7 && opponentGames === 6);

      if (wonSet) {
        newMatch[`${scoringTeam}_sets`] += 1;
        const setResult = { team1_games: newMatch.team1_games, team2_games: newMatch.team2_games };
        newMatch.set_history = [...(newMatch.set_history || []), setResult];
        newMatch.team1_games = 0;
        newMatch.team2_games = 0;

        if (newMatch[`${scoringTeam}_sets`] >= newMatch.sets_to_win) {
          newMatch.status = 'completed';
          newMatch.winner = scoringTeam;
          setWinner(scoringTeam);
          setShowWinnerModal(true);
        }
      }
    } else if (opponentPoint === 'AD') {
      newMatch[`${otherTeam}_points`] = '40';
    } else {
      newMatch[`${scoringTeam}_points`] = nextPoint;
    }

    // Persist updated score to Supabase.
    // IMPORTANT: only update columns that actually exist in Supabase.
    newMatch.updated_date = new Date().toISOString();

    updateMutation.mutate(newMatch);
  }, [match, getNextPoint, updateMutation]);

  const handleUndo = () => {
    if (pointHistory.length === 0) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 20, 30]);
    }
    
    const lastState = pointHistory[pointHistory.length - 1];
    setPointHistory(prev => prev.slice(0, -1));
    updateMutation.mutate(lastState);
    toast.success('Point undone');
  };

  const handleEndMatch = async () => {
    const winnerTeam = match.team1_sets > match.team2_sets ? 'team1' : 
                       match.team2_sets > match.team1_sets ? 'team2' : null;
    
    setShowEndDialog(false);

    // NOTE: Supabase schema doesn't include `completed_at`.
    // We store "end time" in updated_date.
    await api.entities.Match.update(matchId, {
      ...match,
      status: 'completed',
      winner: winnerTeam,
      updated_date: new Date().toISOString(),
    });

    toast.success('Match ended');
    navigate(createPageUrl('Home'));
  };

  const handleDiscardMatch = () => {
    updateMutation.mutate({
      status: 'cancelled',
      updated_date: new Date().toISOString(),
    });
    
    setShowDiscardDialog(false);
    toast.success('Match discarded');
    navigate(createPageUrl('Home'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <p className="text-xl mb-4">Match not found</p>
        <Button onClick={() => navigate(createPageUrl('Home'))}>
          Go Home
        </Button>
      </div>
    );
  }

  const isLive = match.status === 'live';

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-lg border-b border-slate-800/50 shadow-xl"
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(createPageUrl('Home'))}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-2 px-3 py-1 bg-lime-400/20 text-lime-300 rounded-full text-sm font-medium">
                <span className="w-2 h-2 bg-lime-300 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isLive && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowDiscardDialog(true)}
                  className="text-slate-400 hover:text-slate-300 text-xs"
                >
                  Discard
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowEndDialog(true)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Square className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Undo Button */}
        {pointHistory.length > 0 && isLive && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex justify-center"
          >
            <Button 
              variant="outline"
              size="sm"
              onClick={handleUndo}
              className="border-slate-700 hover:bg-slate-800 text-slate-300 shadow-lg transition-all duration-200"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Undo Last Point
            </Button>
          </motion.div>
        )}

        {/* Score Cards */}
        <div className="space-y-4">
          <TeamScore
            teamName={match.team1_name || 'Team 1'}
            players={match.team1_players}
            sets={match.team1_sets}
            games={match.team1_games}
            points={match.team1_points}
            isServing={servingTeam === 1 && isLive}
            onScorePoint={() => handleScorePoint(1)}
            color="emerald"
            disabled={!isLive}
          />
          
          <div className="flex items-center justify-center">
            <span className="text-slate-600 font-bold text-lg">VS</span>
          </div>

          <TeamScore
            teamName={match.team2_name || 'Team 2'}
            players={match.team2_players}
            sets={match.team2_sets}
            games={match.team2_games}
            points={match.team2_points}
            isServing={servingTeam === 2 && isLive}
            onScorePoint={() => handleScorePoint(2)}
            color="lime"
            disabled={!isLive}
          />
        </div>

        {/* Set History */}
        <SetHistory 
          sets={match.set_history} 
          team1Name={match.team1_name}
          team2Name={match.team2_name}
        />

        {/* Match Info */}
        {match.location && (
          <div className="text-center text-slate-500 text-sm">
            📍 {match.location}
          </div>
        )}

        {/* Ad Space */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="h-20 bg-slate-800/30 rounded-2xl border border-slate-700/50 flex items-center justify-center shadow-lg"
        >
          <span className="text-slate-600 text-sm">Ad Space</span>
        </motion.div>
      </div>

      {/* Ad Overlay */}
      <AnimatePresence>
        {showAdOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-slate-800 rounded-3xl p-12 text-center max-w-sm border border-slate-700"
            >
              <p className="text-slate-400 text-lg mb-2">Ad Playing</p>
              <p className="text-slate-600 text-sm">Resuming in 3 seconds...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End Match Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">End Match?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              The current score will be recorded and saved to your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEndMatch}
              className="bg-lime-500 hover:bg-lime-600 text-slate-900"
            >
              End & Save Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discard Match Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Discard Match?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This match will NOT be saved to your history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardMatch}
              className="bg-red-500 hover:bg-red-600"
            >
              Discard Match
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Winner Modal */}
      <AnimatePresence>
        {showWinnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowWinnerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-8 text-center max-w-sm w-full border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg shadow-yellow-500/30"
              >
                <Trophy className="w-10 h-10 text-amber-900" />
              </motion.div>
              
              <h2 className="text-2xl font-bold text-white mb-2">
                🎉 Match Complete!
              </h2>
              
              <p className={`text-xl font-bold mb-6 ${winner === 'team1' ? 'text-emerald-300' : 'text-lime-300'}`}>
                {winner === 'team1' ? match.team1_name : match.team2_name} wins!
              </p>
              
              <div className="text-4xl font-bold text-white mb-8">
                {match.team1_sets} - {match.team2_sets}
              </div>

              <Button
                onClick={() => {
                  setShowWinnerModal(false);
                  navigate(createPageUrl('History'));
                }}
                className="w-full h-12 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-900 font-semibold"
              >
                View Match History
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}