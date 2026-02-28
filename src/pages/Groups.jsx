import React, { useState } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Crown, Users, Trash2, UserPlus, UserMinus, X, LogOut
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useGroup } from '@/components/groups/useGroup';

export default function Groups() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser, myPlayer, activeGroupId, switchGroup } = useGroup();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [managedGroup, setManagedGroup] = useState(null); // group being managed
  const [inviteEmail, setInviteEmail] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState(null);
  const [leaveGroupId, setLeaveGroupId] = useState(null);

  // Fetch all groups where I'm a member or invited
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.list('name'),
  });

  const { data: allGroups = [], refetch: refetchGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => api.entities.Group.list('-created_date'),
    enabled: !!myPlayer,
  });

  // Groups I belong to (member or host)
  const myGroups = allGroups.filter(g =>
    (g.members || []).includes(myPlayer?.id) ||
    g.host_id === myPlayer?.id
  );

  // Groups where I'm invited
  const invitations = allGroups.filter(g =>
    (g.invited_members || []).includes(myPlayer?.id)
  );

  // Members of currently managed group
  const managedMembers = managedGroup
    ? allPlayers.filter(p => (managedGroup.members || []).includes(p.id))
    : [];

  const isHostOf = (group) => group?.host_id === myPlayer?.id;

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !myPlayer) return;
    setIsCreating(true);
    const group = await api.entities.Group.create({
      name: newGroupName.trim(),
      host_id: myPlayer.id,
      members: [myPlayer.id],
      invited_members: [],
    });
    // Auto-set as active if no active group
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

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    const targetPlayer = allPlayers.find(p => p.email?.toLowerCase() === email);
    if (!targetPlayer) {
      toast.error('No player found with that email. They must have a profile first.');
      return;
    }
    if ((managedGroup.members || []).includes(targetPlayer.id)) {
      toast.error('That player is already a member.');
      return;
    }
    const alreadyInvited = (managedGroup.invited_members || []).includes(targetPlayer.id);
    if (alreadyInvited) {
      toast.error('Already invited.');
      return;
    }
    const updated = [...(managedGroup.invited_members || []), targetPlayer.id];
    await api.entities.Group.update(managedGroup.id, { invited_members: updated });
    setManagedGroup(g => ({ ...g, invited_members: updated }));
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    setInviteEmail('');
    toast.success(`Invitation sent to ${targetPlayer.name}!`);
  };

  const handleRemoveMember = async (playerId) => {
    const updated = (managedGroup.members || []).filter(id => id !== playerId);
    await api.entities.Group.update(managedGroup.id, { members: updated });
    setManagedGroup(g => ({ ...g, members: updated }));
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.success('Member removed.');
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

  const handleDeleteGroup = async () => {
    await api.entities.Group.delete(deleteGroupId);
    if (activeGroupId === deleteGroupId) {
      const next = myGroups.find(g => g.id !== deleteGroupId);
      const nextId = next?.id || null;
      await api.auth.updateMe({ activeGroupId: nextId });
      setUser(u => ({ ...u, activeGroupId: nextId }));
    }
    setDeleteGroupId(null);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.success('Group deleted.');
  };

  const handleLeaveGroup = async () => {
    const group = myGroups.find(g => g.id === leaveGroupId);
    if (!group) return;
    const members = (group.members || []).filter(id => id !== myPlayer.id);
    await api.entities.Group.update(leaveGroupId, { members });
    if (activeGroupId === leaveGroupId) {
      const next = myGroups.find(g => g.id !== leaveGroupId);
      const nextId = next?.id || null;
      await api.auth.updateMe({ activeGroupId: nextId });
      setUser(u => ({ ...u, activeGroupId: nextId }));
    }
    setLeaveGroupId(null);
    setManagedGroup(null);
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    toast.success('You left the group.');
  };

  const handleRenameGroup = async (group, newName) => {
    await api.entities.Group.update(group.id, { name: newName });
    setManagedGroup(g => ({ ...g, name: newName }));
    queryClient.invalidateQueries({ queryKey: ['groups'] });
  };

  if (!myPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-slate-400 mb-2">Set up your player profile first.</p>
          <Button onClick={() => navigate(createPageUrl('Profile'))} className="bg-lime-400 text-slate-900">
            Go to Profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      <div className="max-w-lg mx-auto px-4 pb-28" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">My Groups</h1>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-lime-400/20 border border-lime-400/40 text-lime-300 hover:bg-lime-400/30 h-9 px-3"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>

        {/* Create Group Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4"
            >
              <Label className="text-slate-300 mb-2 block">Group Name</Label>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Invitations */}
        {invitations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Invitations</h2>
            <div className="space-y-3">
              {invitations.map(group => (
                <div key={group.id} className="bg-amber-500/10 border border-amber-400/30 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-white">{group.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {(group.members || []).length} member(s)
                      </p>
                    </div>
                    <span className="text-xs text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">Invited</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(group)}
                      className="flex-1 py-2 rounded-xl bg-lime-400 text-slate-900 text-sm font-semibold hover:bg-lime-300 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(group)}
                      className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Groups */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">My Groups</h2>
          {myGroups.length === 0 ? (
            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-slate-700/40">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-1">No groups yet</p>
              <p className="text-slate-500 text-sm">Create one or wait for an invitation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myGroups.map(group => {
                const isHost = isHostOf(group);
                const isActive = group.id === activeGroupId;
                return (
                  <div
                    key={group.id}
                    className={`bg-slate-800/60 border rounded-2xl p-4 transition-all ${isActive ? 'border-lime-400/60 bg-lime-400/5' : 'border-slate-700/50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white truncate">{group.name}</p>
                          {isHost && (
                            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-300">
                              <Crown className="w-3 h-3" /> Host
                            </span>
                          )}
                          {isActive && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-lime-400/15 border border-lime-400/40 text-lime-300">Active</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {(group.members || []).length} member(s)
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => switchGroup(group.id)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-lime-400/20 border border-lime-400/40 text-lime-300 hover:bg-lime-400/30 transition-colors font-medium"
                          >
                            Switch
                          </button>
                        )}
                        <button
                          onClick={() => setManagedGroup(group)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-slate-300 hover:bg-slate-600 transition-colors"
                        >
                          {isHost ? 'Manage' : 'View'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Manage Group Sheet ── */}
      <AnimatePresence>
        {managedGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center"
            onClick={() => setManagedGroup(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6 pb-10 max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-white">{managedGroup.name}</h2>
                <button onClick={() => setManagedGroup(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rename (host only) */}
              {isHostOf(managedGroup) && (
                <div className="mb-5">
                  <Label className="text-slate-300 mb-2 block text-sm">Rename Group</Label>
                  <RenameInline group={managedGroup} onRename={handleRenameGroup} />
                </div>
              )}

              {/* Members list */}
              <div className="mb-5">
                <p className="text-sm font-semibold text-slate-400 mb-3">Members</p>
                <div className="space-y-2">
                  {managedMembers.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-slate-800 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-white">{p.name}</span>
                        {p.id === managedGroup.host_id && (
                          <Crown className="w-3.5 h-3.5 text-yellow-400" />
                        )}
                      </div>
                      {isHostOf(managedGroup) && p.id !== managedGroup.host_id && (
                        <button
                          onClick={() => handleRemoveMember(p.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Invite (host only) */}
              {isHostOf(managedGroup) && (
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
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                  {(managedGroup.invited_members || []).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-500 mb-1">Pending invitations:</p>
                      {(managedGroup.invited_members || []).map(pid => {
                        const p = allPlayers.find(x => x.id === pid);
                        return (
                          <span key={pid} className="inline-block text-xs bg-amber-400/10 border border-amber-400/30 text-amber-300 rounded-full px-2 py-0.5 mr-1 mb-1">
                            {p?.name || pid.slice(0, 6) + '…'}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                {!isHostOf(managedGroup) && (
                  <Button
                    onClick={() => setLeaveGroupId(managedGroup.id)}
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Leave Group
                  </Button>
                )}
                {isHostOf(managedGroup) && (
                  <Button
                    onClick={() => setDeleteGroupId(managedGroup.id)}
                    variant="ghost"
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Group
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteGroupId} onOpenChange={() => setDeleteGroupId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Group?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete the group. Match history is preserved but won't be linked to this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave confirm */}
      <AlertDialog open={!!leaveGroupId} onOpenChange={() => setLeaveGroupId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Leave Group?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              You'll be removed from this group. You'll need a new invitation to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveGroup} className="bg-red-600 hover:bg-red-700">Leave</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Inline rename input (host only)
function RenameInline({ group, onRename }) {
  const [name, setName] = useState(group.name);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name.trim() === group.name) return;
    setSaving(true);
    await onRename(group, name.trim());
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