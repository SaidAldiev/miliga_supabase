import React from 'react';
import { motion } from 'framer-motion';
import { Check, UserCircle2 } from 'lucide-react';

/**
 * Displays a grid of group members. Tapping a card assigns that player
 * to the currently active slot. Already-selected players are disabled.
 *
 * Props:
 *  - players: Player[] — full list of selectable players
 *  - selectedIds: string[] — all currently selected player IDs (across all slots)
 *  - activeSlot: { team: 'A'|'B', index: number } | null
 *  - teamA: (Player|null)[]
 *  - teamB: (Player|null)[]
 *  - onSelect: (player, slot) => void
 *  - onSlotClick: (slot) => void
 *  - matchType: 'doubles'|'singles'
 *  - teamColor: { A: string, B: string }
 */
export default function PlayerSelector({
  players,
  selectedIds,
  activeSlot,
  teamA,
  teamB,
  onSelect,
  onSlotClick,
  matchType,
}) {
  const slotsA = matchType === 'singles' ? [0] : [0, 1];
  const slotsB = matchType === 'singles' ? [0] : [0, 1];

  const isActiveSlot = (team, idx) =>
    activeSlot && activeSlot.team === team && activeSlot.index === idx;

  const renderSlot = (team, idx) => {
    const player = team === 'A' ? teamA[idx] : teamB[idx];
    const isActive = isActiveSlot(team, idx);
    const color = team === 'A' ? 'emerald' : 'lime';

    return (
      <button
        key={`${team}-${idx}`}
        onClick={() => onSlotClick({ team, index: idx })}
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left w-full ${
          isActive
            ? `border-${color}-400 bg-${color}-400/20 shadow-lg shadow-${color}-400/20`
            : player
            ? `border-${color}-400/50 bg-${color}-400/10`
            : 'border-slate-700 bg-slate-800/60 border-dashed'
        }`}
      >
        {player ? (
          <>
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className={`w-7 h-7 rounded-full bg-${color}-400/20 flex items-center justify-center shrink-0`}>
                <span className="text-xs font-bold text-white">{player.name[0]?.toUpperCase()}</span>
              </div>
            )}
            <span className={`text-sm font-medium text-${color}-200 truncate`}>{player.name}</span>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full border border-dashed border-slate-600 flex items-center justify-center shrink-0">
              <span className="text-slate-500 text-xs">?</span>
            </div>
            <span className="text-sm text-slate-500">
              {isActive ? 'Tap a player below ↓' : matchType === 'singles' ? 'Select player' : `Player ${idx + 1}`}
            </span>
          </>
        )}
        {isActive && (
          <span className={`ml-auto text-xs text-${color}-400 font-semibold shrink-0`}>Active</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      {/* Team slots */}
      <div className="grid grid-cols-2 gap-4">
        {/* Team A */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
              {matchType === 'singles' ? 'Player 1' : 'Team A'}
            </span>
          </div>
          {slotsA.map(idx => renderSlot('A', idx))}
        </div>

        {/* Team B */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2.5 h-2.5 bg-lime-400 rounded-full" />
            <span className="text-xs font-semibold text-lime-300 uppercase tracking-wide">
              {matchType === 'singles' ? 'Player 2' : 'Team B'}
            </span>
          </div>
          {slotsB.map(idx => renderSlot('B', idx))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-700" />
        <span className="text-xs text-slate-500 uppercase tracking-wider">Select player</span>
        <div className="flex-1 h-px bg-slate-700" />
      </div>

      {/* Player grid */}
      {players.length === 0 ? (
        <div className="text-center py-6">
          <UserCircle2 className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No players found</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {players.map(player => {
            const isSelected = selectedIds.includes(player.id);
            const isDisabled = isSelected || !activeSlot;

            // Determine which team/slot this player is assigned to (for color hint)
            const inA = teamA.findIndex(p => p?.id === player.id);
            const inB = teamB.findIndex(p => p?.id === player.id);
            const teamColor = inA >= 0 ? 'emerald' : inB >= 0 ? 'lime' : null;

            return (
              <motion.button
                key={player.id}
                whileTap={!isDisabled ? { scale: 0.93 } : {}}
                onClick={() => !isDisabled && onSelect(player, activeSlot)}
                disabled={isDisabled}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all relative ${
                  isSelected && teamColor
                    ? `border-${teamColor}-400/70 bg-${teamColor}-400/15 opacity-70`
                    : isSelected
                    ? 'border-slate-600 bg-slate-800/40 opacity-50'
                    : !activeSlot
                    ? 'border-slate-700/50 bg-slate-800/30 opacity-60 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-800/60 hover:border-lime-400/50 hover:bg-slate-700/60 cursor-pointer'
                }`}
              >
                {isSelected && (
                  <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-${teamColor || 'slate'}-400 flex items-center justify-center`}>
                    <Check className="w-2.5 h-2.5 text-slate-900" />
                  </div>
                )}
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.name} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold ${
                    isSelected && teamColor
                      ? `bg-${teamColor}-400/30 text-${teamColor}-200`
                      : 'bg-slate-700 text-slate-300'
                  }`}>
                    {player.flag || player.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-center text-slate-300 font-medium leading-tight line-clamp-2 w-full">
                  {player.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}