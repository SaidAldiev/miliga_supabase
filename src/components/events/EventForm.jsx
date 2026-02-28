import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EventForm({ onSubmit, onClose, isSubmitting }) {
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState([]);

  const addInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || invitedEmails.includes(email)) return;
    setInvitedEmails([...invitedEmails, email]);
    setInviteEmail('');
  };

  const removeInvite = (email) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !dateTime) return;
    onSubmit({ title, locationName, locationAddress, dateTime, maxPlayers, invitedEmails });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-white">Create Event</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Event Title *</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Friday Night Padel"
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Date & Time *</Label>
              <Input
                type="datetime-local"
                value={dateTime}
                onChange={e => setDateTime(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Venue / Club Name</Label>
              <Input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Central Padel Club"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Address (optional)</Label>
              <Input
                value={locationAddress}
                onChange={e => setLocationAddress(e.target.value)}
                placeholder="123 Main Street"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Max Players</Label>
              <div className="flex gap-2">
                {[2, 4, 6, 8].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMaxPlayers(n)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                      maxPlayers === n
                        ? 'bg-lime-400/20 border-lime-400/60 text-lime-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Invite by email */}
            <div>
              <Label className="text-slate-300 text-sm mb-1 block">Invite Players (by email)</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInvite(); }}}
                  placeholder="friend@email.com"
                  type="email"
                  className="bg-slate-800 border-slate-700 text-white flex-1"
                />
                <Button type="button" variant="outline" size="icon" onClick={addInvite} className="border-slate-700 hover:bg-slate-800 shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {invitedEmails.length > 0 && (
                <div className="mt-2 space-y-1">
                  {invitedEmails.map(email => (
                    <div key={email} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-slate-300 truncate">{email}</span>
                      <button type="button" onClick={() => removeInvite(email)} className="text-slate-500 hover:text-red-400 ml-2 shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || !title || !dateTime}
              className="w-full h-12 bg-gradient-to-r from-lime-400 to-emerald-500 text-slate-900 font-semibold rounded-xl mt-2"
            >
              {isSubmitting ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}