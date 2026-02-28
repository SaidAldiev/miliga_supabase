import React, { useState } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Trash2, Users } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
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

export default function Players() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [deletePlayerId, setDeletePlayerId] = useState(null);

  const { data: players, isLoading } = useQuery({
    queryKey: ['players'],
    queryFn: () => api.entities.Player.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Player.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      setNewPlayerName('');
      setNewPlayerEmail('');
      toast.success('Player added!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Player.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] });
      toast.success('Player removed');
    },
  });

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) {
      toast.error('Please enter a player name');
      return;
    }
    createMutation.mutate({
      name: newPlayerName.trim(),
      email: newPlayerEmail.trim() || undefined,
    });
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
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold">Players</h1>
        </div>

        {/* Add Player Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-lime-400" />
            <Label className="text-lime-300 font-semibold">Add New Player</Label>
          </div>
          <div className="space-y-3">
            <Input
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="Player name"
              className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
            />
            <Input
              value={newPlayerEmail}
              onChange={(e) => setNewPlayerEmail(e.target.value)}
              placeholder="Email (optional)"
              type="email"
              className="bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 rounded-xl"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
            />
            <Button
              onClick={handleAddPlayer}
              disabled={createMutation.isPending}
              className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-semibold rounded-xl"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Player
            </Button>
          </div>
        </motion.div>

        {/* Players List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-sm font-semibold text-slate-400 mb-3">
            All Players ({players?.length || 0})
          </h3>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : players?.length > 0 ? (
              players.map((player, idx) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-lime-400 to-emerald-500 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{player.name}</p>
                      {player.email && (
                        <p className="text-xs text-slate-400">{player.email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletePlayerId(player.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-slate-600" />
                </div>
                <p className="text-slate-400 mb-2">No players yet</p>
                <p className="text-slate-500 text-sm">Add your first player to get started!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletePlayerId} onOpenChange={() => setDeletePlayerId(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Player?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will remove the player from your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                deleteMutation.mutate(deletePlayerId);
                setDeletePlayerId(null);
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}