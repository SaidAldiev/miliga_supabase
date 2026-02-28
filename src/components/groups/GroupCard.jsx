import React from 'react';
import { Crown, Users, Check } from 'lucide-react';

export default function GroupCard({ group, isActive, isHost, onSwitch, onManage }) {
  return (
    <div
      className={`bg-slate-800/60 border rounded-2xl p-4 transition-all ${
        isActive ? 'border-lime-400/60 bg-lime-400/5' : 'border-slate-700/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-white truncate">{group.name}</p>
            {isHost && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 font-medium">
                <Crown className="w-3 h-3" /> Host
              </span>
            )}
            {isActive && (
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-lime-400/15 border border-lime-400/40 text-lime-300 font-medium">
                <Check className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-slate-400 text-sm">
            <Users className="w-3.5 h-3.5" />
            <span>{(group.members || []).length} member{(group.members || []).length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!isActive && (
            <button
              onClick={() => onSwitch(group.id)}
              className="text-xs px-3 py-1.5 rounded-lg bg-lime-400/20 border border-lime-400/40 text-lime-300 hover:bg-lime-400/30 transition-colors font-medium"
            >
              Switch
            </button>
          )}
          <button
            onClick={() => onManage(group)}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors font-medium"
          >
            {isHost ? 'Manage' : 'View'}
          </button>
        </div>
      </div>
    </div>
  );
}