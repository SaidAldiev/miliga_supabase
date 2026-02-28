import React, { useState, useEffect } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, ChevronRight, UserPlus, LogIn, CalendarPlus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MatchCard from '@/components/match/MatchCard';
import EventCard from '@/components/events/EventCard';
import EventForm from '@/components/events/EventForm';
import { toast } from 'sonner';
import { useGroup } from '@/components/groups/useGroup';
import GroupHeader from '@/components/groups/GroupHeader';

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, myPlayer, activeGroup, activeGroupId, switchGroup, setUser } = useGroup();
  const [showEventForm, setShowEventForm] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const { data: recentMatches, isLoading } = useQuery({
    queryKey: ['recentMatches', activeGroupId],
    queryFn: () => activeGroupId
      ? api.entities.Match.filter({ status: 'completed', group_id: activeGroupId }, '-created_date', 3)
      : api.entities.Match.filter({ status: 'completed' }, '-created_date', 3),
  });

  const { data: allMatches } = useQuery({
    queryKey: ['allMatchesHome', activeGroupId],
    queryFn: () => activeGroupId
      ? api.entities.Match.filter({ status: 'completed', group_id: activeGroupId })
      : api.entities.Match.filter({ status: 'completed' }),
    enabled: !!user,
  });

  // Calculate quick stats for current user
  const calculateStats = () => {
    if (!allMatches || !user) return null;

    const userIdentifiers = [user.email?.toLowerCase(), user.full_name?.toLowerCase()].filter(Boolean);

    const teamContainsMe = (refs, nameFallback) => {
      return (nameFallback || []).some(n => userIdentifiers.some(id => n.toLowerCase().includes(id)));
    };

    let wins = 0, losses = 0;
    allMatches.forEach(match => {
      const isTeam1 = teamContainsMe(match.team1_player_refs, match.team1_players);
      const isTeam2 = teamContainsMe(match.team2_player_refs, match.team2_players);
      if (!isTeam1 && !isTeam2) return;
      if (isTeam1) { if (match.winner === 'team1') wins++; else if (match.winner) losses++; }
      else { if (match.winner === 'team2') wins++; else if (match.winner) losses++; }
    });

    const total = wins + losses;
    return { wins, losses, total, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  };

  const stats = calculateStats();

  // Events queries
  const { data: myEvents = [] } = useQuery({
    queryKey: ['myEvents', user?.email],
    queryFn: () => api.entities.Event.list('-event_datetime'),
    enabled: !!user,
  });

  // Events the user participates in or is invited to (upcoming only)
  const now = new Date().toISOString();
  const upcomingEvents = myEvents.filter(e =>
    e.event_datetime >= now &&
    e.status !== 'cancelled' &&
    ((e.participants || []).includes(user?.email) || (e.invited_users || []).includes(user?.email))
  );
  const invitations = myEvents.filter(e =>
    (e.invited_users || []).includes(user?.email) && e.event_datetime >= now
  );

  const handleCreateEvent = async ({ title, locationName, locationAddress, dateTime, maxPlayers, invitedEmails }) => {
    setIsCreatingEvent(true);
    const event = await api.entities.Event.create({
      title,
      location_name: locationName,
      location_address: locationAddress,
      event_datetime: new Date(dateTime).toISOString(),
      max_players: maxPlayers,
      participants: [user.email],
      invited_users: invitedEmails,
      declined_users: [],
      status: 'open',
    });
    queryClient.invalidateQueries({ queryKey: ['myEvents'] });
    setShowEventForm(false);
    setIsCreatingEvent(false);
    toast.success('Event created! 🎾');
  };

  const handleAccept = async (event) => {
    const participants = [...(event.participants || [])];
    const invited = (event.invited_users || []).filter(e => e !== user.email);
    if (participants.includes(user.email)) return;
    participants.push(user.email);
    const isFull = participants.length >= (event.max_players || 4);
    await api.entities.Event.update(event.id, {
      participants,
      invited_users: invited,
      status: isFull ? 'full' : 'open',
    });
    queryClient.invalidateQueries({ queryKey: ['myEvents'] });
    if (isFull) toast.success("🎾 Your Padel event is ready to go!");
    else toast.success("You've joined the event!");
  };

  const handleDecline = async (event) => {
    const invited = (event.invited_users || []).filter(e => e !== user.email);
    const declined = [...(event.declined_users || []), user.email];
    await api.entities.Event.update(event.id, { invited_users: invited, declined_users: declined });
    queryClient.invalidateQueries({ queryKey: ['myEvents'] });
    toast.info("You declined the event.");
  };

  const handleDeleteEvent = async (id) => {
    await api.entities.Event.delete(id);
    queryClient.invalidateQueries({ queryKey: ['myEvents'] });
    toast.success("Event deleted.");
  };

  const handleInvite = async () => {
    const email = prompt('Enter email to invite:');
    if (email) {
      await api.users.inviteUser(email, 'user');
      alert('Invitation sent!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      <div className="max-w-lg mx-auto px-4 pb-24" style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
        {/* Top Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-4"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎾</span>
            <span className="text-lg font-bold text-lime-300">MiLiga</span>
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <Button variant="ghost" size="icon" onClick={handleInvite} className="text-lime-300 hover:bg-slate-800/50">
                <UserPlus className="w-5 h-5" />
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => api.auth.redirectToLogin()} className="text-lime-300 hover:bg-slate-800/50">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            )}
          </div>
        </motion.div>

        {/* Group Header */}
        {user && (
          <GroupHeader
            user={user}
            myPlayer={myPlayer}
            activeGroup={activeGroup}
            activeGroupId={activeGroupId}
            switchGroup={switchGroup}
            setUser={setUser}
          />
        )}

        {/* ── Events Section ── */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="mb-6"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400">Upcoming Events</h3>
              <button
                onClick={() => setShowEventForm(true)}
                className="flex items-center gap-1 text-xs text-lime-400 hover:text-lime-300 transition-colors font-medium"
              >
                <CalendarPlus className="w-3.5 h-3.5" />
                Create Event
              </button>
            </div>

            {/* Invitations sub-section */}
            {invitations.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Invitations</p>
                <div className="space-y-3">
                  {invitations.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      currentUserEmail={user.email}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      onDelete={handleDeleteEvent}
                      index={i}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Events user is part of (accepted) */}
            {(() => {
              const acceptedEvents = upcomingEvents.filter(e => (e.participants || []).includes(user.email));
              return acceptedEvents.length > 0 ? (
                <div className="space-y-3">
                  {acceptedEvents.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      currentUserEmail={user.email}
                      onAccept={handleAccept}
                      onDecline={handleDecline}
                      onDelete={handleDeleteEvent}
                      index={i}
                    />
                  ))}
                </div>
              ) : invitations.length === 0 ? (
                <div className="bg-slate-800/30 rounded-2xl border border-slate-700/40 px-4 py-5 text-center">
                  <p className="text-slate-500 text-sm">No upcoming events</p>
                  <button
                    onClick={() => setShowEventForm(true)}
                    className="mt-2 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    Create one →
                  </button>
                </div>
              ) : null;
            })()}
          </motion.div>
        )}

        {/* Event Form Modal */}
        {showEventForm && (
          <EventForm
            onSubmit={handleCreateEvent}
            onClose={() => setShowEventForm(false)}
            isSubmitting={isCreatingEvent}
          />
        )}

        {/* New Match CTA */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <button
            onClick={() => navigate(createPageUrl('NewMatch'))}
            className="w-full bg-gradient-to-r from-lime-400/20 to-emerald-400/20 border border-lime-400/30 hover:border-lime-400/60 rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:from-lime-400/30 hover:to-emerald-400/30"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-400/20">
              <Plus className="w-7 h-7 text-slate-900" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-lime-300">Start New Game</p>
              <p className="text-sm text-slate-400">🎾 Padel</p>
            </div>
            <ChevronRight className="w-5 h-5 text-lime-300" />
          </button>
        </motion.div>

        {/* Quick Stats */}
        {user && stats && stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-4 gap-3 mb-6"
          >
            <motion.div whileHover={{ scale: 1.02 }} className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50 shadow-lg text-center">
              <p className="text-slate-400 text-xs mb-1">Played</p>
              <p className="text-xl font-bold text-white">{stats.total}</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-emerald-500/10 rounded-2xl p-3 border border-emerald-400/30 shadow-lg text-center">
              <p className="text-emerald-400 text-xs mb-1">Wins</p>
              <p className="text-xl font-bold text-emerald-300">{stats.wins}</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-red-500/10 rounded-2xl p-3 border border-red-400/20 shadow-lg text-center">
              <p className="text-red-400 text-xs mb-1">Losses</p>
              <p className="text-xl font-bold text-red-300">{stats.losses}</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-lime-400/10 rounded-2xl p-3 border border-lime-400/30 shadow-lg text-center">
              <p className="text-lime-400 text-xs mb-1">Win %</p>
              <p className="text-xl font-bold text-lime-300">{stats.winRate}%</p>
            </motion.div>
          </motion.div>
        )}

        {/* Last Match */}
        {isLoading ? (
          <Skeleton className="h-36 rounded-2xl bg-slate-800/50 mb-6" />
        ) : recentMatches && recentMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Last Match</h3>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Link to={createPageUrl('LiveMatch') + `?id=${recentMatches[0].id}`}>
                <MatchCard match={recentMatches[0]} />
              </Link>
            </motion.div>
          </motion.div>
        )}

      </div>
    </div>
  );
}