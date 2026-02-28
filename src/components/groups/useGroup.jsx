import { useState, useEffect } from 'react';
import { api } from '@/api/supabaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Hook that provides the current user's active group context.
 * Returns: { user, myPlayer, activeGroup, activeGroupId, isLoading, switchGroup }
 */
export function useGroup() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    api.auth.me().then(setUser).catch(() => {});
  }, []);

  const activeGroupId = user?.activeGroupId || null;

  const { data: myPlayer } = useQuery({
    queryKey: ['myPlayer', user?.email],
    queryFn: () => api.entities.Player.filter({ email: user.email }).then(r => r?.[0] || null),
    enabled: !!user?.email,
  });

  const { data: activeGroup, isLoading: groupLoading } = useQuery({
    queryKey: ['group', activeGroupId],
    queryFn: () => api.entities.Group.get(activeGroupId),
    enabled: !!activeGroupId,
  });

  const switchGroup = async (groupId) => {
    await api.auth.updateMe({ activeGroupId: groupId });
    setUser(u => ({ ...u, activeGroupId: groupId }));
    queryClient.invalidateQueries({ queryKey: ['group'] });
  };

  return {
    user,
    setUser,
    myPlayer,
    activeGroup,
    activeGroupId,
    isLoading: !user || (!!activeGroupId && groupLoading),
    switchGroup,
  };
}