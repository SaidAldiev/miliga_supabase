import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/supabaseClient';
import { Users, Crown, Check, Plus, X, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * "My Groups" section shown on the Profile page.
 * Lets the user switch active group, create, leave groups.
 */
export default function MyGroupsSection({ user, myPlayer, activeGroupId, switchGroup, setUser }) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: allGroups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.entities.Group.list('-created_date'),
    enabled: !!myPlayer,
  });

  const myGroups = allGroups.filter(g =>
    (g.members || []).includes(myPlayer?.id) || g.host_id === myPlayer?.id
  );

  const handleSwitch = async (groupId) => {
    await switchGroup(groupId);
    toast.success('Active group changed!');
  };

  const handleLeave = async (group) => {
    const members = (group.members || []).filter(id => id !== myPlayer.id);
    await api.entities.Group.update(group.id, { members });
    if (activeGroupId === group.id) {
      const next = myGroups.find(g => g.id !== group.id);
      const nextId = next?.id || null;
      await api.auth.updateMe({ activeGroupId: nextId });
      setUser(u => ({ ...u, activeGroupId: nextId }));
    }
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.success('You left the group.');
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !myPlayer) return;
    setIsCreating(true);
    const group = await api.entities.Group.create({
      name: newGroupName.trim(),
      host_id: myPlayer.id,
      members: [myPlayer.id],
      invited_members: [],
    });
    if (!activeGroupId) {
      await api.auth.updateMe({ activeGroupId: group.id });
      setUser(u => ({ ...u, activeGroupId: group.id }));
    }
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    setNewGroupName('');
    setShowCreateForm(false);
    setIsCreating(false);
    toast.success(`Group "${group.name}" created!`);
  };

  if (!myPlayer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">My Groups</h2>
        <button
          onClick={() => setShowCreateForm(v => !v)}
          className="text-xs text-lime-400 hover:text-lime-300 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      {showCreateForm && (
        <div className="mb-3 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <Label className="text-slate-300 mb-2 block text-sm">Group Name</Label>
          <div className="flex gap-2">
            <Input
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup(); }}
              placeholder="e.g., Friday Night Crew"
              className="bg-slate-700 border-slate-600 text-white flex-1"
              autoFocus
            />
            <Button onClick={handleCreateGroup} disabled={isCreating || !newGroupName.trim()} className="bg-lime-400 text-slate-900 shrink-0">
              {isCreating ? '…' : 'Create'}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)} className="text-slate-400 shrink-0">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {myGroups.length === 0 ? (
        <div className="text-center py-8 bg-slate-800/30 rounded-2xl border border-slate-700/40">
          <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No groups yet</p>
          <p className="text-slate-500 text-xs mt-1">Create one or wait for an invitation.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {myGroups.map(group => {
            const isActive = group.id === activeGroupId;
            const isHostG = group.host_id === myPlayer?.id;
            return (
              <div
                key={group.id}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  isActive ? 'border-lime-400/60 bg-lime-400/5' : 'border-slate-700/50 bg-slate-800/40'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{group.name}</span>
                    {isHostG && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                    {isActive && <Check className="w-3 h-3 text-lime-400 shrink-0" />}
                  </div>
                  <span className="text-xs text-slate-400">{(group.members || []).length} members</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!isActive && (
                    <button
                      onClick={() => handleSwitch(group.id)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-lime-400/20 border border-lime-400/40 text-lime-300 hover:bg-lime-400/30 transition-colors"
                    >
                      Switch
                    </button>
                  )}
                  {!isHostG && (
                    <button
                      onClick={() => handleLeave(group)}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-1"
                    >
                      <LogOut className="w-3 h-3" /> Leave
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}