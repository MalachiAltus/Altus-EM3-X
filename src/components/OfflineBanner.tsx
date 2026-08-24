import { useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';

import { getOffline, subscribeOffline } from '@/lib/network/status';
import { colors, spacing, type } from '@/theme/tokens';

export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribeOffline, getOffline, getOffline);

  if (!offline) return null;

  return (
    <View style={{ backgroundColor: colors.warning, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
      <Text style={{ ...type.small, color: colors.white, textAlign: 'center' }}>
        You&apos;re offline — showing the last loaded data.
      </Text>
    </View>
  );
}
