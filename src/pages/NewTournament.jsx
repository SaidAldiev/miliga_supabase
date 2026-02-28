import React, { useState } from 'react';
import { api } from '@/api/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Plus, X, Shuffle, Users, MapPin, Play } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoundRobin(teams) {
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({ team1: teams[i], team2: teams[j] });
    }
  }
  return matches;
}

export default function NewTournament() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('pool'); // 'pool' | 'manual'
  const [poolPlayers, setPoolPlayers] = useState(['', '', '', '']);
  const [teams, setTeams] = useState([
    { name: '', players: ['', ''] },
    { name: '', players: ['', ''] },
  ]);
  const [location, setLocation] = useState('');
  const [setsToWin, setSetsToWin] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const { data: savedPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.list('name'),
  });

  // Pool mode: add/remove players
  const addPoolPlayer = () => setPoolPlayers(p => [...p, '']);
  const removePoolPlayer = (idx) => setPoolPlayers(p => p.filter((_, i) => i !== idx));
  const updatePoolPlayer = (idx, val) => setPoolPlayers(p => p.map((v, i) => i === idx ? val : v));

  // Manual mode: add/remove teams
  const addTeam = () => setTeams(t => [...t, { name: '', players: ['', ''] }]);
  const removeTeam = (idx) => setTeams(t => t.filter((_, i) => i !== idx));
  const updateTeamName = (idx, val) => setTeams(t => t.map((team, i) => i === idx ? { ...team, name: val } : team));
  const updateTeamPlayer = (tIdx, pIdx, val) => setTeams(t => t.map((team, i) => i === tIdx ? {
    ...team,
    players: team.players.map((p, j) => j === pIdx ? val : p)
  } : team));

  const handleCreate = async () => {
    setIsCreating(true);

    let finalTeams = [];

    if (mode === 'pool') {
      const filled = poolPlayers.map(p => p.trim()).filter(Boolean);
      if (filled.length < 4) {
        toast.error('Add at least 4 players to the pool');
        setIsCreating(false);
        return;
      }
      // Shuffle and pair into teams of 2
      const shuffled = shuffle(filled);
      for (let i = 0; i < shuffled.length - 1; i += 2) {
        finalTeams.push({
          name: '',
          players: [shuffled[i], shuffled[i + 1]]
        });
      }
      if (shuffled.length % 2 !== 0) {
        // Odd player: solo team
        const last = shuffled[shuffled.length - 1];
        finalTeams.push({ name: last, players: [last] });
      }
    } else {
      finalTeams = teams.map(t => ({
        name: t.name.trim(),
        players: t.players.map(p => p.trim()).filter(Boolean)
      })).filter(t => t.players.length > 0);

      if (finalTeams.length < 2) {
        toast.error('Add at least 2 teams');
        setIsCreating(false);
        return;
      }
    }

    // Build player identity ref snapshot
    const buildRefs = (names) => names.map(name => {
      const found = savedPlayers.find(p => p.name.toLowerCase() === name.toLowerCase());
      return { player_id: found?.id || null, name_at_time: name };
    });

    // Generate round-robin schedule
    const schedule = generateRoundRobin(finalTeams);

    // Create all matches
    const createdIds = [];
    for (const { team1, team2 } of schedule) {
      const m = await api.entities.Match.create({
        sport: 'padel',
        sets_to_win: setsToWin,
        location,
        team1_name: team1.name || team1.players.join(' & '),
        team2_name: team2.name || team2.players.join(' & '),
        team1_players: team1.players,
        team2_players: team2.players,
        team1_player_refs: buildRefs(team1.players),
        team2_player_refs: buildRefs(team2.players),
        status: 'live',
        team1_sets: 0,
        team2_sets: 0,
        team1_games: 0,
        team2_games: 0,
        team1_points: '0',
        team2_points: '0',
        total_points_team1: 0,
        total_points_team2: 0,
        set_history: []
      });
      createdIds.push(m.id);
    }

    toast.success(`Tournament created! ${schedule.length} matches scheduled.`);
    // Navigate to the first match
    navigate(createPageUrl('LiveMatch') + `?id=${createdIds[0]}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white"
    >
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Tournament</h1>
            <p className="text-sm text-slate-400">Round-robin schedule</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Mode Toggle */}
          <div>
            <Label className="text-slate-300 mb-3 block">How to assign teams?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('pool')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${mode === 'pool' ? 'border-lime-400 bg-lime-400/10' : 'border-slate-700 bg-slate-800/50'}`}
              >
                <Shuffle className="w-5 h-5 mb-2 text-lime-300" />
                <p className="font-semibold text-sm">Auto-pair from pool</p>
                <p className="text-xs text-slate-400 mt-0.5">Add players, app picks teams</p>
              </button>
              <button
                onClick={() => setMode('manual')}
                className={`p-4 rounded-2xl border-2 transition-all text-left ${mode === 'manual' ? 'border-lime-400 bg-lime-400/10' : 'border-slate-700 bg-slate-800/50'}`}
              >
                <Users className="w-5 h-5 mb-2 text-emerald-300" />
                <p className="font-semibold text-sm">Manual teams</p>
                <p className="text-xs text-slate-400 mt-0.5">Define teams yourself</p>
              </button>
            </div>
          </div>

          {/* Sets to win */}
          <div>
            <Label className="text-slate-300 mb-3 block">Sets to Win (per match)</Label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setSetsToWin(n)}
                  className={`py-3 rounded-2xl border-2 transition-all font-bold text-lg ${
                    setsToWin === n ? 'border-lime-400 bg-lime-400/10 text-lime-300' : 'border-slate-700 bg-slate-800/50 text-slate-300'
                  }`}
                >
                  {n}
                  <p className="text-xs font-normal text-slate-500 mt-0.5">
                    {n === 1 ? 'Best of 1' : n === 2 ? 'Best of 3' : 'Best of 5'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <Label className="text-slate-300 mb-3 block">Location (optional)</Label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Central Padel Club"
                className="pl-12 h-14 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-2xl"
              />
            </div>
          </div>

          {/* Pool mode */}
          <AnimatePresence mode="wait">
            {mode === 'pool' && (
              <motion.div key="pool" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-slate-300">Player Pool</Label>
                  <span className="text-xs text-slate-500">{poolPlayers.filter(p => p.trim()).length} players</span>
                </div>
                <datalist id="saved-players">
                  {savedPlayers.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
                <div className="space-y-2">
                  {poolPlayers.map((player, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={player}
                        onChange={(e) => updatePoolPlayer(idx, e.target.value)}
                        list="saved-players"
                        placeholder={`Player ${idx + 1}`}
                        className="bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
                      />
                      {poolPlayers.length > 4 && (
                        <Button variant="ghost" size="icon" onClick={() => removePoolPlayer(idx)} className="text-slate-500 hover:text-red-400 shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-3 border-slate-700 text-slate-300" onClick={addPoolPlayer}>
                  <Plus className="w-4 h-4 mr-2" /> Add Player
                </Button>
                {poolPlayers.filter(p => p.trim()).length >= 4 && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Will create {Math.floor(poolPlayers.filter(p => p.trim()).length / 2)} teams → {(() => { const n = Math.floor(poolPlayers.filter(p => p.trim()).length / 2); return (n * (n - 1)) / 2; })()} matches
                  </p>
                )}
              </motion.div>
            )}

            {mode === 'manual' && (
              <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-slate-300">Teams</Label>
                  <span className="text-xs text-slate-500">{teams.length} teams → {(teams.length * (teams.length - 1)) / 2} matches</span>
                </div>
                <datalist id="saved-players-m">
                  {savedPlayers.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
                <div className="space-y-3">
                  {teams.map((team, tIdx) => (
                    <div key={tIdx} className="bg-slate-800/40 rounded-2xl p-4 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-300">Team {tIdx + 1}</span>
                        {teams.length > 2 && (
                          <Button variant="ghost" size="icon" onClick={() => removeTeam(tIdx)} className="text-slate-500 hover:text-red-400 h-7 w-7">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <Input
                        value={team.name}
                        onChange={(e) => updateTeamName(tIdx, e.target.value)}
                        placeholder="Team name (optional)"
                        className="mb-2 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl text-sm"
                      />
                      {team.players.map((player, pIdx) => (
                        <Input
                          key={pIdx}
                          value={player}
                          onChange={(e) => updateTeamPlayer(tIdx, pIdx, e.target.value)}
                          list="saved-players-m"
                          placeholder={`Player ${pIdx + 1}`}
                          className="mb-2 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl text-sm"
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-3 border-slate-700 text-slate-300" onClick={addTeam}>
                  <Plus className="w-4 h-4 mr-2" /> Add Team
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Start */}
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full h-16 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-900 text-lg font-semibold rounded-2xl shadow-lg shadow-yellow-400/20"
          >
            <Play className="w-6 h-6 mr-2" />
            {isCreating ? 'Creating...' : 'Start Tournament'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}