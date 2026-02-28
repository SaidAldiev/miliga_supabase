import React, { useState, useEffect } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, LogOut, User } from 'lucide-react';
import { useGroup } from '@/components/groups/useGroup';
import MyGroupsSection from '@/components/groups/MyGroupsSection';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, setUser, myPlayer: groupMyPlayer, activeGroupId, switchGroup } = useGroup();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch all players once for uniqueness checks
  const { data: allPlayers = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.list('name'),
    enabled: !!user,
  });

  useEffect(() => {
    if (user !== null) setIsLoading(false);
  }, [user]);

  // The Player record linked to the current user (use groupMyPlayer as primary, fall back to local lookup)
  const myPlayer = groupMyPlayer || allPlayers.find(p => p.email?.toLowerCase() === user?.email?.toLowerCase());

  useEffect(() => {
    if (myPlayer) setNickname(myPlayer.name);
    else if (user) setNickname(user.full_name || '');
  }, [myPlayer, user]);

  const handleSave = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      toast.error('Nickname cannot be empty');
      return;
    }

    // Uniqueness check: no other player can have this name
    const conflict = allPlayers.find(
      p => p.name.toLowerCase() === trimmed.toLowerCase() && p.id !== myPlayer?.id
    );
    if (conflict) {
      toast.error('That nickname is already taken. Please choose another.');
      return;
    }

    setIsSaving(true);

    if (myPlayer) {
      // Update existing Player record
      await api.entities.Player.update(myPlayer.id, { name: trimmed });
    } else {
      // Create a new Player record linked to this user
      await api.entities.Player.create({
        name: trimmed,
        email: user.email,
        status: 'active',
      });
    }

    // Also keep auth nickname in sync for display elsewhere
    await api.auth.updateMe({ nickname: trimmed });

    queryClient.invalidateQueries({ queryKey: ['players'] });
    toast.success('Profile updated!');
    setIsSaving(false);
  };

  const handleLogout = () => api.auth.logout();

  const handleDeleteAccount = async () => {
    try {
      await api.auth.deleteMe();
      toast.success('Account deleted');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-6 pb-24" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('Home'))}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Avatar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center mb-8"
        >
          <Avatar className="w-24 h-24 border-4 border-slate-700">
            <AvatarImage src={myPlayer?.avatar_url || user?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-lime-400 to-emerald-500 text-slate-900 text-2xl">
              {(nickname || user?.email)?.[0]?.toUpperCase() || <User className="w-10 h-10" />}
            </AvatarFallback>
          </Avatar>
          <p className="mt-4 text-lg font-semibold">{nickname || 'Set your nickname'}</p>
          <p className="text-slate-500 text-sm">{user?.email}</p>
          {myPlayer && (
            <p className="text-xs text-lime-500/70 mt-1">Player ID: {myPlayer.id.slice(0, 8)}…</p>
          )}
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div>
            <Label className="text-slate-300 mb-2 block">Nickname <span className="text-slate-500 text-xs">(must be unique)</span></Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Your unique display name"
              className="h-14 bg-slate-800/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-2xl"
            />
          </div>

          {!myPlayer && (
            <p className="text-xs text-amber-400/80 bg-amber-400/10 border border-amber-400/20 rounded-xl px-4 py-3">
              Save your nickname to create your player profile and appear in standings.
            </p>
          )}

          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full h-14 bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-300 hover:to-emerald-400 text-slate-900 rounded-2xl font-semibold"
          >
            <Save className="w-5 h-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </motion.div>

        {/* My Groups */}
        <MyGroupsSection
          user={user}
          myPlayer={myPlayer}
          activeGroupId={activeGroupId}
          switchGroup={switchGroup}
          setUser={setUser}
        />

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <LogOut className="w-5 h-5 mr-2" />
            Sign Out
          </Button>
        </motion.div>

        {/* Delete Account */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4"
        >
          <Button
            onClick={() => setShowDeleteDialog(true)}
            variant="destructive"
            className="w-full h-12 bg-red-600 hover:bg-red-700"
          >
            Delete Account
          </Button>
        </motion.div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Account?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete your account and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-red-600 hover:bg-red-700">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}