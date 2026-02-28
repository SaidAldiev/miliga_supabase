import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/supabaseClient';
import { Users, Crown, ChevronDown, Plus, X, Check, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

/**
 * Full group header: shows active group name, member count, host badge.
 * "Switch" opens a bottom-sheet to switch or create groups.
 * "Manage" (host only) opens the manage sheet.
 */
export default function GroupHeader({ user, myPlayer, activeGroup, activeGroupId, switchGroup, setUser }) {
  const queryClient = useQueryClient();
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  const isHost = activeGroup?.host_id === myPlayer?.id;

  const { data: allGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.entities.Group.list('-created_date'),
    enabled: !!myPlayer,
  });

  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.list('name'),
    enabled: showManage,
  });

  const myGroups = allGroups.filter(g =>
    (g.members || []).includes(myPlayer?.id) || g.host_id === myPlayer?.id
  );

  const invitations = allGroups.filter(g =>
    (g.invited_members || []).includes(myPlayer?.id)
  );

  const managedMembers = activeGroup
    ? allPlayers.filter(p => (activeGroup.members || []).includes(p.id))
    : [];

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

  const handleSwitch = async (groupId) => {
    await switchGroup(groupId);
    setShowSwitcher(false);
    toast.success('Group switched!');
  };

  const handleAcceptInvitation = async (group) => {
    const members = [...(group.members || []), myPlayer.id];
    const invited = (group.invited_members || []).filter(id => id !== myPlayer.id);
    await api.entities.Group.update(group.id, { members, invited_members: invited });
    if (!activeGroupId) {
      await api.auth.updateMe({ activeGroupId: group.id });
      setUser(u => ({ ...u, activeGroupId: group.id }));
    }
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.success(`Joined "${group.name}"!`);
  };

  const handleDeclineInvitation = async (group) => {
    const invited = (group.invited_members || []).filter(id => id !== myPlayer.id);
    await api.entities.Group.update(group.id, { invited_members: invited });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.info('Invitation declined.');
  };

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !activeGroup) return;
    const targetPlayer = allPlayers.find(p => p.email?.toLowerCase() === email);
    if (!targetPlayer) { toast.error('No player found with that email.'); return; }
    if ((activeGroup.members || []).includes(targetPlayer.id)) { toast.error('Already a member.'); return; }
    if ((activeGroup.invited_members || []).includes(targetPlayer.id)) { toast.error('Already invited.'); return; }
    const updated = [...(activeGroup.invited_members || []), targetPlayer.id];
    await api.entities.Group.update(activeGroup.id, { invited_members: updated });
    queryClient.invalidateQueries({ queryKey: ['groups', 'group'] });
    setInviteEmail('');
    toast.success(`Invitation sent to ${targetPlayer.name}!`);
  };

  const handleRemoveMember = async (playerId) => {
    const updated = (activeGroup.members || []).filter(id => id !== playerId);
    await api.entities.Group.update(activeGroup.id, { members: updated });
    queryClient.invalidateQueries({ queryKey: ['groups', 'group'] });
    toast.success('Member removed.');
  };

  const handleRenameGroup = async (newName) => {
    if (!newName.trim() || newName.trim() === activeGroup.name) return;
    await api.entities.Group.update(activeGroup.id, { name: newName.trim() });
    queryClient.invalidateQueries({ queryKey: ['groups', 'group'] });
    toast.success('Group renamed!');
  };

  const handleDeleteGroup = async () => {
    if (!activeGroup) return;
    await api.entities.Group.delete(activeGroup.id);
    const next = myGroups.find(g => g.id !== activeGroup.id);
    const nextId = next?.id || null;
    await api.auth.updateMe({ activeGroupId: nextId });
    setUser(u => ({ ...u, activeGroupId: nextId }));
    queryClient.invalidateQueries({ queryKey: ['groups', 'group'] });
    setShowManage(false);
    toast.success('Group deleted.');
  };

  const handleLeaveGroup = async () => {
    if (!activeGroup) return;
    const members = (activeGroup.members || []).filter(id => id !== myPlayer.id);
    await api.entities.Group.update(activeGroup.id, { members });
    const next = myGroups.find(g => g.id !== activeGroup.id);
    const nextId = next?.id || null;
    await api.auth.updateMe({ activeGroupId: nextId });
    setUser(u => ({ ...u, activeGroupId: nextId }));
    queryClient.invalidateQueries({ queryKey: ['groups', 'group'] });
    setShowManage(false);
    toast.success('You left the group.');
  };

  if (!user) return null;

  return (
    <>
      {/* Group Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`mb-5 rounded-2xl border transition-all ${activeGroup ? 'bg-slate-800/60 border-slate-700/50' : 'bg-slate-800/40 border-dashed border-slate-700/50'}`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeGroup ? 'bg-lime-400/20' : 'bg-slate-700'}`}>
            <Users className={`w-4 h-4 ${activeGroup ? 'text-lime-400' : 'text-slate-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            {activeGroup ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-white truncate">{activeGroup.name}</p>
                  {isHost && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-300 shrink-0">
                      <Crown className="w-2.5 h-2.5" /> Host
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{(activeGroup.members || []).length} member{(activeGroup.members || []).length !== 1 ? 's' : ''}</p>
              </>
            ) : (
              <p className="text-sm text-slate-400">No active group</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {isHost && activeGroup && (
              <button
                onClick={() => setShowManage(true)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1"
              >
                <Settings className="w-3 h-3" /> Manage
              </button>
            )}
            <button
              onClick={() => setShowSwitcher(true)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-lime-400/20 border border-lime-400/40 text-lime-300 hover:bg-lime-400/30 transition-colors flex items-center gap-1"
            >
              <ChevronDown className="w-3 h-3" /> Switch
            </button>
          </div>
        </div>

        {/* Group invitations inline */}
        {invitations.length > 0 && (
          <div className="px-4 pb-3 border-t border-slate-700/40 pt-3 space-y-2">
            <p className="text-[10px] text-amber-300 uppercase tracking-wide font-semibold">Group Invitations</p>
            {invitations.map(group => (
              <div key={group.id} className="flex items-center gap-2 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
                <p className="text-sm text-white flex-1 font-medium">{group.name}</p>
                <button onClick={() => handleAcceptInvitation(group)} className="text-xs px-2.5 py-1 rounded-lg bg-lime-400 text-slate-900 font-semibold hover:bg-lime-300">Accept</button>
                <button onClick={() => handleDeclineInvitation(group)} className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600">Decline</button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Switch Group Sheet ── */}
      <AnimatePresence>
        {showSwitcher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowSwitcher(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6 pb-10 max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">My Groups</h2>
                <button onClick={() => setShowSwitcher(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {myGroups.length === 0 && (
                <p className="text-slate-400 text-sm text-center py-6">No groups yet. Create one below.</p>
              )}

              <div className="space-y-2 mb-5">
                {myGroups.map(group => {
                  const active = group.id === activeGroupId;
                  const host = group.host_id === myPlayer?.id;
                  return (
                    <button
                      key={group.id}
                      onClick={() => !active && handleSwitch(group.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
                        active ? 'border-lime-400/60 bg-lime-400/10' : 'border-slate-700/50 bg-slate-800/60 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{group.name}</span>
                          {host && <Crown className="w-3 h-3 text-yellow-400 shrink-0" />}
                        </div>
                        <span className="text-xs text-slate-400">{(group.members || []).length} members</span>
                      </div>
                      {active && <Check className="w-4 h-4 text-lime-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Create new group */}
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-600 text-slate-400 hover:text-lime-300 hover:border-lime-400/40 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Create New Group
                </button>
              ) : (
                <div className="bg-slate-800 rounded-2xl p-4">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Manage Group Sheet (Host) ── */}
      <AnimatePresence>
        {showManage && activeGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setShowManage(false)}
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
                <h2 className="text-lg font-bold text-white">Manage: {activeGroup.name}</h2>
                <button onClick={() => setShowManage(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rename */}
              <div className="mb-5">
                <Label className="text-slate-300 mb-2 block text-sm">Rename Group</Label>
                <RenameInline group={activeGroup} onRename={handleRenameGroup} />
              </div>

              {/* Members */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-slate-400 mb-3">Members</p>
                <div className="space-y-2">
                  {managedMembers.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-white">{p.name}</span>
                        {p.id === activeGroup.host_id && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                      </div>
                      {p.id !== activeGroup.host_id && (
                        <button onClick={() => handleRemoveMember(p.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite */}
              <div className="mb-6">
                <Label className="text-slate-300 mb-2 block text-sm">Invite Player by Email</Label>
                <div className="flex gap-2">
                  <Input
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
                    placeholder="player@email.com"
                    type="email"
                    className="bg-slate-800 border-slate-700 text-white flex-1"
                  />
                  <Button onClick={handleInvite} variant="outline" className="border-slate-700 hover:bg-slate-800 shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {(activeGroup.invited_members || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(activeGroup.invited_members || []).map(pid => {
                      const p = allPlayers.find(x => x.id === pid);
                      return (
                        <span key={pid} className="text-xs bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full px-2 py-0.5">
                          {p?.name || pid.slice(0, 6) + '…'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Danger zone */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={handleDeleteGroup}
                  className="w-full py-3 rounded-xl text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Delete Group
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function RenameInline({ group, onRename }) {
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === group.name) return;
    setSaving(true);
    await onRename(name.trim());
    setSaving(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') save(); }}
        className="bg-slate-800 border-slate-700 text-white flex-1"
      />
      <Button onClick={save} disabled={saving || name.trim() === group.name} className="bg-lime-400 text-slate-900 shrink-0">
        {saving ? '…' : 'Save'}
      </Button>
    </div>
  );
}