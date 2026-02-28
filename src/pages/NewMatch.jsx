import React, { useState, useEffect } from 'react';
import { api } from '@/api/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Play, Trophy, Users, User, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PlayerSelector from '@/components/match/PlayerSelector';

export default function NewMatch() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [matchType, setMatchType] = useState('doubles');
  const [setsToWin, setSetsToWin] = useState(1);
  const [location, setLocation] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Slots: null = empty
  const slotCount = matchType === 'doubles' ? 2 : 1;
  const [teamA, setTeamA] = useState([null, null]);
  const [teamB, setTeamB] = useState([null, null]);
  // activeSlot: which slot the next tap will fill
  const [activeSlot, setActiveSlot] = useState({ team: 'A', index: 0 });

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  // Reset slots when match type changes
  useEffect(() => {
    setTeamA(Array(slotCount).fill(null));
    setTeamB(Array(slotCount).fill(null));
    setActiveSlot({ team: 'A', index: 0 });
    setValidationError('');
  }, [matchType]);

  // Fetch active group and its member players
  const { data: userData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
  });

  const activeGroupId = userData?.activeGroupId;

  const { data: group } = useQuery({
    queryKey: ['group', activeGroupId],
    queryFn: () => api.entities.Group.get(activeGroupId),
    enabled: !!activeGroupId,
  });

  const memberIds = group?.members || [];

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.filter({ status: 'active' }, 'name'),
  });

  // Only show players that belong to the active group
  const groupPlayers = activeGroupId
    ? allPlayers.filter(p => memberIds.includes(p.id))
    : allPlayers;

  // IDs of all currently selected players
  const selectedIds = [
    ...teamA.filter(Boolean).map(p => p.id),
    ...teamB.filter(Boolean).map(p => p.id),
  ];

  const requiredPlayers = slotCount * 2;
  const hasEnoughPlayers = groupPlayers.length >= requiredPlayers;

  const handleSelectPlayer = (player, slot) => {
    if (!slot) return;
    // Duplicate check
    if (selectedIds.includes(player.id)) {
      toast.error('A player cannot be added twice in the same match.');
      return;
    }
    setValidationError('');

    if (slot.team === 'A') {
      const next = [...teamA];
      next[slot.index] = player;
      setTeamA(next);
    } else {
      const next = [...teamB];
      next[slot.index] = player;
      setTeamB(next);
    }

    // Auto-advance to next empty slot
    const nextSlot = findNextEmptySlot(slot, teamA, teamB, slotCount, player, slot.team);
    setActiveSlot(nextSlot);
  };

  const findNextEmptySlot = (justFilled, currentA, currentB, count, filledPlayer, filledTeam) => {
    // Build updated teams to search
    const newA = [...currentA];
    const newB = [...currentB];
    if (filledTeam === 'A') newA[justFilled.index] = filledPlayer;
    else newB[justFilled.index] = filledPlayer;

    for (let i = 0; i < count; i++) {
      if (!newA[i]) return { team: 'A', index: i };
    }
    for (let i = 0; i < count; i++) {
      if (!newB[i]) return { team: 'B', index: i };
    }
    return null; // all filled
  };

  const handleSlotClick = (slot) => {
    setActiveSlot(slot);
    // Clear that slot so user can reassign
    if (slot.team === 'A' && teamA[slot.index]) {
      const next = [...teamA];
      next[slot.index] = null;
      setTeamA(next);
    } else if (slot.team === 'B' && teamB[slot.index]) {
      const next = [...teamB];
      next[slot.index] = null;
      setTeamB(next);
    }
  };

  const validate = () => {
    const filledA = teamA.slice(0, slotCount).filter(Boolean);
    const filledB = teamB.slice(0, slotCount).filter(Boolean);

    if (filledA.length < slotCount || filledB.length < slotCount) {
      return `Please select all ${requiredPlayers} players before starting.`;
    }

    const allIds = [...filledA, ...filledB].map(p => p.id);
    if (new Set(allIds).size !== allIds.length) {
      return 'A player cannot be added twice in the same match.';
    }

    if (activeGroupId) {
      const allInGroup = allIds.every(id => memberIds.includes(id));
      if (!allInGroup) return 'All players must belong to the active group.';
    }

    return null;
  };

  const handleCreateMatch = async () => {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }
    setIsCreating(true);

    const filledA = teamA.slice(0, slotCount).filter(Boolean);
    const filledB = teamB.slice(0, slotCount).filter(Boolean);

    const teamANames = filledA.map(p => p.name);
    const teamBNames = filledB.map(p => p.name);

    const matchData = {
      sport: 'padel',
      match_type: matchType,
      sets_to_win: setsToWin,
      location,
      group_id: activeGroupId || null,
      team1_name: teamANames.join(' & '),
      team2_name: teamBNames.join(' & '),
      team1_players: teamANames,
      team2_players: teamBNames,
      team1_player_refs: filledA.map(p => ({ player_id: p.id, name_at_time: p.name })),
      team2_player_refs: filledB.map(p => ({ player_id: p.id, name_at_time: p.name })),
      status: 'live',
      team1_sets: 0,
      team2_sets: 0,
      team1_games: 0,
      team2_games: 0,
      team1_points: '0',
      team2_points: '0',
      total_points_team1: 0,
      total_points_team2: 0,
      set_history: [],
    };

    const newMatch = await api.entities.Match.create(matchData);
    toast.success('Match started!');
    navigate(createPageUrl('LiveMatch') + `?id=${newMatch.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white"
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-28" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">New Match</h1>
        </div>

        <div className="space-y-6">
          {/* Mode: Tournament shortcut */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl border-2 border-lime-400 bg-lime-400/10 text-left">
                <Play className="w-6 h-6 mb-2 text-lime-300" />
                <p className="font-semibold">Single Match</p>
                <p className="text-xs text-slate-400 mt-0.5">2 teams, one game</p>
              </div>
              <motion.button
                onClick={() => navigate(createPageUrl('NewTournament'))}
                whileTap={{ scale: 0.95 }}
                className="p-4 rounded-2xl border-2 border-slate-700 bg-slate-800/50 hover:border-slate-600 transition-all text-left"
              >
                <Trophy className="w-6 h-6 mb-2 text-yellow-400" />
                <p className="font-semibold">Tournament</p>
                <p className="text-xs text-slate-400 mt-0.5">Multiple players, auto schedule</p>
              </motion.button>
            </div>
          </motion.div>

          {/* Match Type */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Label className="text-slate-300 mb-3 block">Match Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'doubles', label: 'Doubles', sub: '2v2', Icon: Users },
                { value: 'singles', label: 'Singles', sub: '1v1', Icon: User },
              ].map(({ value, label, sub, Icon }) => (
                <motion.button
                  key={value}
                  onClick={() => setMatchType(value)}
                  whileTap={{ scale: 0.95 }}
                  className={`p-4 rounded-2xl border-2 transition-all text-left ${
                    matchType === value
                      ? 'border-lime-400 bg-lime-400/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${matchType === value ? 'text-lime-300' : 'text-slate-400'}`} />
                  <p className="font-semibold">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Sets to Win */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Label className="text-slate-300 mb-3 block">Sets to Win</Label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(n => (
                <motion.button
                  key={n}
                  onClick={() => setSetsToWin(n)}
                  whileTap={{ scale: 0.95 }}
                  className={`py-4 rounded-2xl border-2 transition-all font-bold text-xl ${
                    setsToWin === n
                      ? 'border-lime-400 bg-lime-400/10 text-lime-300'
                      : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {n}
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    {n === 1 ? 'Best of 1' : n === 2 ? 'Best of 3' : 'Best of 5'}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Location */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Label className="text-slate-300 mb-3 block">Location (optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g., Central Padel Club"
                className="pl-12 h-14 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-2xl"
              />
            </div>
          </motion.div>

          {/* Player Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4"
          >
            <Label className="text-slate-300 mb-4 block font-semibold">Select Players</Label>

            {!hasEnoughPlayers ? (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  Not enough players in this group to create a {matchType} match.
                  You need at least {requiredPlayers} players.{' '}
                  <Link to={createPageUrl('Players')} className="underline text-amber-200">
                    Add players →
                  </Link>
                </p>
              </div>
            ) : (
              <PlayerSelector
                players={groupPlayers}
                selectedIds={selectedIds}
                activeSlot={activeSlot}
                teamA={teamA.slice(0, slotCount)}
                teamB={teamB.slice(0, slotCount)}
                onSelect={handleSelectPlayer}
                onSlotClick={handleSlotClick}
                matchType={matchType}
              />
            )}
          </motion.div>

          {/* Validation error */}
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{validationError}</p>
            </motion.div>
          )}

          {/* Start Button */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Button
              onClick={handleCreateMatch}
              disabled={isCreating || !hasEnoughPlayers}
              className="w-full h-16 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-900 text-lg font-semibold rounded-2xl shadow-lg shadow-lime-400/30 disabled:opacity-50"
            >
              <Play className="w-6 h-6 mr-2" />
              {isCreating ? 'Starting...' : 'Start Match'}
            </Button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}