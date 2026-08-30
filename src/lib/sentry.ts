// Production error monitoring — off by default. Set EXPO_PUBLIC_SENTRY_DSN
// (see .env.example) to enable; without it, Sentry.init() never runs and
// this whole module is inert, so nothing changes for anyone who hasn't set
// up a Sentry project yet.
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const sentryEnabled = !!dsn;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    // Screen names/route params can include nothing sensitive today, but
    // default to not sending device/user PII automatically regardless.
    sendDefaultPii: false,
  });
}

export { Sentry };
