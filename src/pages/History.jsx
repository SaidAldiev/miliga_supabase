import React, { useState, useRef, useEffect } from 'react'; // already has useState
import { api } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MatchCard from '@/components/match/MatchCard';
import PointLog from '@/components/match/PointLog';

export default function History() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullStartY, setPullStartY] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'doubles' | 'singles'
  const contentRef = useRef(null);

  const [activeGroupId, setActiveGroupId] = useState(null);

  useEffect(() => {
    api.auth.me().then(u => setActiveGroupId(u?.activeGroupId || null)).catch(() => {});
  }, []);

  const { data: matches, isLoading, refetch } = useQuery({
    queryKey: ['matches', activeGroupId],
    queryFn: () => activeGroupId
      ? api.entities.Match.filter({ status: 'completed', group_id: activeGroupId }, '-created_date', 50)
      : api.entities.Match.filter({ status: 'completed' }, '-created_date', 50),
  });

  const allCompleted = matches || [];
  const completedMatches = typeFilter === 'all'
    ? allCompleted
    : allCompleted.filter(m => (m.match_type || 'doubles') === typeFilter);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (navigator.vibrate) navigator.vibrate(30);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Pull to refresh handlers
  useEffect(() => {
    const handleTouchStart = (e) => {
      if (contentRef.current?.scrollTop === 0) {
        setPullStartY(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (pullStartY > 0 && contentRef.current?.scrollTop === 0) {
        const distance = e.touches[0].clientY - pullStartY;
        if (distance > 0 && distance < 150) {
          setPullDistance(distance);
        }
      }
    };

    const handleTouchEnd = () => {
      if (pullDistance > 80) {
        handleRefresh();
      }
      setPullStartY(0);
      setPullDistance(0);
    };

    const ref = contentRef.current;
    if (ref) {
      ref.addEventListener('touchstart', handleTouchStart);
      ref.addEventListener('touchmove', handleTouchMove);
      ref.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (ref) {
        ref.removeEventListener('touchstart', handleTouchStart);
        ref.removeEventListener('touchmove', handleTouchMove);
        ref.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [pullStartY, pullDistance]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-slate-900 to-lime-950 text-white" ref={contentRef}>
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center items-center z-50 transition-all"
          style={{ 
            height: `${Math.min(pullDistance, 80)}px`,
            opacity: pullDistance / 80
          }}
        >
          <RefreshCw className={`w-6 h-6 text-lime-400 ${pullDistance > 80 ? 'animate-spin' : ''}`} />
        </div>
      )}
      
      <div className="max-w-lg mx-auto px-4 py-6 pb-24" style={{ paddingTop: 'calc(1.5rem + env(safe-area-inset-top))' }}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Match History</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'doubles', 'singles'].map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                typeFilter === f
                  ? 'bg-lime-400 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Matches List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-36 rounded-2xl bg-slate-800/50" />
            ))}
          </div>
        ) : completedMatches.length > 0 ? (
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {completedMatches.map((match, idx) => (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <MatchCard match={match} />
                <PointLog match={match} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-600" />
            </div>
            <p className="text-slate-400 mb-2">No matches found</p>
            <p className="text-slate-500 text-sm">Start playing to build your history!</p>
          </div>
        )}
      </div>
    </div>
  );
}