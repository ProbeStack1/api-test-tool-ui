/**
 * useGlobalTimezone — React hook subscribing to the global timezone
 * setter so any component re-renders when the user changes their zone.
 */
import { useEffect, useState } from 'react';
import { getGlobalTimezone, subscribeTimezone, setGlobalTimezone } from '@/lib/timezone';

export const useGlobalTimezone = (): [string, (z: string) => void] => {
  const [zone, setZone] = useState<string>(getGlobalTimezone());
  useEffect(() => subscribeTimezone(setZone), []);
  return [zone, setGlobalTimezone];
};
