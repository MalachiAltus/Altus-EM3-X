import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function deviceLabel(): string {
  return `${Platform.OS}:${Device.modelName ?? 'unknown'}`;
}

// Registers this device for push notifications and stores the Expo push
// token against the signed-in staff member, so the send-push edge function
// (triggered from shift/swap/absence changes) can reach them. No-ops
// gracefully wherever the prerequisites aren't met yet — web builds, the iOS
// Simulator/Android emulator, or before `eas init` has written a projectId
// into app.json — rather than surfacing an error to the user.
export function usePushNotifications(staffId: string | null) {
  useEffect(() => {
    if (!staffId || Platform.OS === 'web' || !Device.isDevice) return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.log('[push] skipping registration: no EAS projectId configured (run `eas init`)');
      return;
    }

    let cancelled = false;
    const id = staffId;

    async function register() {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }

      const existing = await Notifications.getPermissionsAsync();
      let status = existing.status;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted' || cancelled) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      if (cancelled) return;

      const device_info = deviceLabel();
      await supabase.from('push_tokens').delete().eq('staff_id', id).eq('device_info', device_info);
      await supabase.from('push_tokens').insert({ staff_id: id, expo_push_token: token, device_info });
    }

    register().catch((err) => console.log('[push] registration failed', err));

    return () => {
      cancelled = true;
    };
  }, [staffId]);
}
