import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthContext } from '@/components/AuthProvider';

interface SyncQueueItem {
  id: string;
  operation_type: string;
  created_at: string;
  sync_status: string;
  sync_attempts: number;
  device_timestamp: string;
  payload: any;
}

export function useSyncQueue() {
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { profile } = useAuthContext();

  const fetchQueue = useCallback(async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('attendance_sync_queue')
        .select('*')
        .eq('employee_id', profile.id)
        .in('sync_status', ['pending', 'failed'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      setQueueItems(data || []);
    } catch (error) {
      console.error('Error fetching sync queue:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const syncQueue = useCallback(async () => {
    if (!profile?.id || queueItems.length === 0) return;

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of queueItems) {
        try {
          const payload = item.payload as any;

          // Process based on operation type
          if (item.operation_type === 'clock_in') {
            const { error } = await supabase
              .from('attendance_logs')
              .insert({
                employee_id: profile.id,
                clock_in_time: payload.clock_in_time,
                location_type: payload.location_type,
                branch_id: payload.branch_id,
                clock_in_latitude: payload.latitude,
                clock_in_longitude: payload.longitude,
                field_work_reason: payload.field_work_reason,
                field_work_location: payload.field_work_location,
                device_timestamp: item.device_timestamp,
                sync_status: 'synced',
              });

            if (error) throw error;
          } else if (item.operation_type === 'clock_out') {
            const { error } = await supabase
              .from('attendance_logs')
              .update({
                clock_out_time: payload.clock_out_time,
                clock_out_latitude: payload.latitude,
                clock_out_longitude: payload.longitude,
                sync_status: 'synced',
              })
              .eq('id', payload.log_id);

            if (error) throw error;
          } else if (item.operation_type === 'break_start' || item.operation_type === 'break_end') {
            // Handle break operations
            const { error } = await supabase
              .from('attendance_breaks')
              .upsert(payload);

            if (error) throw error;
          }

          // Mark as synced
          await supabase
            .from('attendance_sync_queue')
            .update({ 
              sync_status: 'synced',
              synced_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          successCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          
          // Update attempt count
          await supabase
            .from('attendance_sync_queue')
            .update({ 
              sync_status: 'failed',
              sync_attempts: item.sync_attempts + 1,
              sync_error: error instanceof Error ? error.message : 'Unknown error',
              last_sync_attempt: new Date().toISOString(),
            })
            .eq('id', item.id);

          failCount++;
        }
      }

      // Refresh queue after sync
      await fetchQueue();

      if (successCount > 0) {
        toast.success(`Synced ${successCount} item${successCount > 1 ? 's' : ''}`);
      }
      if (failCount > 0) {
        toast.error(`Failed to sync ${failCount} item${failCount > 1 ? 's' : ''}`);
      }
    } catch (error) {
      console.error('Error syncing queue:', error);
      toast.error('Failed to sync offline data');
    } finally {
      setIsSyncing(false);
    }
  }, [queueItems, profile?.id, fetchQueue]);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      if (queueItems.length > 0) {
        toast.info('Connection restored. Syncing offline data...');
        syncQueue();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queueItems.length, syncQueue]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchQueue();
    };
    window.addEventListener('attendance-refresh', handleRefresh);
    return () => window.removeEventListener('attendance-refresh', handleRefresh);
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return {
    queueItems,
    pendingCount: queueItems.length,
    loading,
    isSyncing,
    syncQueue,
    refetch: fetchQueue,
  };
}
