import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

// Cloudflare Turnstile is a web-only widget (an iframe challenge) — there is
// no equivalent embed for the native app, so signup CAPTCHA protection only
// covers the web form today. Native sign-up requests still go through the
// same submit-signup-request Edge Function and are still subject to the
// pending-email uniqueness guard; they just don't get an interactive
// challenge. Off by default: with no EXPO_PUBLIC_TURNSTILE_SITE_KEY set,
// this renders nothing and the form submits without a token, matching
// TURNSTILE_SECRET_KEY being unset server-side (see submit-signup-request).
const SITE_KEY = process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY;

export const turnstileEnabled = Platform.OS === 'web' && !!SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: Element,
        options: { sitekey: string; callback: (token: string) => void; 'expired-callback'?: () => void }
      ) => string;
    };
  }
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

export function TurnstileWidget({ onVerify, onExpire }: Props) {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !SITE_KEY || typeof document === 'undefined') return;

    function renderWidget() {
      const node = containerRef.current as unknown as Element | null;
      if (!node || !window.turnstile) return;
      window.turnstile.render(node, {
        sitekey: SITE_KEY!,
        callback: onVerify,
        'expired-callback': onExpire,
      });
    }

    if (window.turnstile) {
      renderWidget();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (Platform.OS !== 'web' || !SITE_KEY) return null;
  return <View ref={containerRef} />;
}
