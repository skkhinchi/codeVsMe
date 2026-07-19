import { useEffect, useState } from 'react';

/**
 * Phones only — iPad (~768px+) and desktops stay on the full web layout.
 */
export const PHONE_VIEWPORT_QUERY = '(max-width: 767px)';

function matchesPhoneViewport() {
  return typeof window !== 'undefined' && window.matchMedia(PHONE_VIEWPORT_QUERY).matches;
}

/** True when the viewport is phone-sized (not tablet / desktop). */
export function usePhoneViewport() {
  const [isPhone, setIsPhone] = useState(matchesPhoneViewport);

  useEffect(() => {
    const media = window.matchMedia(PHONE_VIEWPORT_QUERY);
    const sync = () => setIsPhone(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  return isPhone;
}
