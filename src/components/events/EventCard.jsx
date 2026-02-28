import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function EventCard({ event, currentUserEmail, onAccept, onDecline, onDelete, index = 0 }) {
  const isCreator = event.created_by === currentUserEmail;
  const isParticipant = (event.participants || []).includes(currentUserEmail);
  const isInvited = (event.invited_users || []).includes(currentUserEmail);
  const isFull = event.status === 'full';
  const participantCount = (event.participants || []).length;

  const statusColor = isFull
    ? 'bg-lime-400/20 text-lime-300 border-lime-400/40'
    : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40';
  const statusLabel = isFull ? '✅ Event Ready' : '🟢 Open';

  const eventDate = event.event_datetime ? new Date(event.event_datetime) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3"
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">{event.title}</p>
          {isCreator && <p className="text-xs text-slate-500 mt-0.5">You created this</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor}`}>{statusLabel}</span>
          {isCreator && (
            <button
              onClick={() => onDelete(event.id)}
              className="text-slate-600 hover:text-red-400 transition-colors p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        {eventDate && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{format(eventDate, 'EEE, MMM d · HH:mm')}</span>
          </div>
        )}
        {event.location_name && (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{event.location_name}{event.location_address ? ` · ${event.location_address}` : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Users className="w-4 h-4 text-slate-500 shrink-0" />
          <span>{participantCount}/{event.max_players || 4} players</span>
          {/* mini progress bar */}
          <div className="flex-1 bg-slate-700 rounded-full h-1.5 ml-1 overflow-hidden">
            <div
              className="bg-lime-400 h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min((participantCount / (event.max_players || 4)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action buttons for invited users */}
      {isInvited && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onAccept(event)}
            className="flex-1 py-2 rounded-xl bg-lime-400 text-slate-900 text-sm font-semibold hover:bg-lime-300 transition-colors"
          >
            Accept
          </button>
          <button
            onClick={() => onDecline(event)}
            className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-200 text-sm font-medium hover:bg-slate-600 transition-colors"
          >
            Decline
          </button>
        </div>
      )}

      {/* Already joined badge */}
      {isParticipant && !isInvited && (
        <div className="pt-1">
          <span className="text-xs text-emerald-400 font-medium">✓ You're in!</span>
        </div>
      )}
    </motion.div>
  );
}