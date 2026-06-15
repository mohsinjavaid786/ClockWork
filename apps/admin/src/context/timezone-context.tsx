'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type TzMode = 'local' | 'utc' | 'employee';

interface TimezoneContextValue {
  mode: TzMode;
  setMode: (m: TzMode) => void;
  /** IANA timezone of the employee currently being viewed (member pages set this). */
  employeeTz: string | null;
  setEmployeeTz: (tz: string | null) => void;
  /** Resolved IANA timezone for formatting; undefined means the browser's local zone. */
  timeZone: string | undefined;
  /** GMT offset label for a mode, e.g. "GMT-7". */
  offsetLabel: (m: TzMode) => string;
  /** Format an ISO timestamp in the selected timezone. */
  format: (iso: string, opts: Intl.DateTimeFormatOptions) => string;
}

const LOCAL_TZ =
  typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;

function offsetFor(tz: string | undefined): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<TzMode>('local');
  const [employeeTz, setEmployeeTz] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('cw_tz_mode');
    if (saved === 'utc' || saved === 'local') setModeState(saved);
  }, []);

  const setMode = useCallback((m: TzMode) => {
    setModeState(m);
    if (m === 'utc' || m === 'local') localStorage.setItem('cw_tz_mode', m);
  }, []);

  // Effective mode: fall back to local if "employee" is selected but no employee
  // is in context (e.g. after navigating away from a member page).
  const effectiveMode: TzMode = mode === 'employee' && !employeeTz ? 'local' : mode;

  const timeZone =
    effectiveMode === 'utc'
      ? 'UTC'
      : effectiveMode === 'employee'
        ? (employeeTz ?? undefined)
        : undefined;

  const offsetLabel = useCallback(
    (m: TzMode) => {
      if (m === 'utc') return 'GMT+0';
      if (m === 'employee') return offsetFor(employeeTz ?? undefined);
      return offsetFor(LOCAL_TZ);
    },
    [employeeTz],
  );

  const format = useCallback(
    (iso: string, opts: Intl.DateTimeFormatOptions) => {
      try {
        return new Date(iso).toLocaleString('en-US', { ...opts, timeZone });
      } catch {
        return new Date(iso).toLocaleString('en-US', opts);
      }
    },
    [timeZone],
  );

  const value = useMemo<TimezoneContextValue>(
    () => ({ mode: effectiveMode, setMode, employeeTz, setEmployeeTz, timeZone, offsetLabel, format }),
    [effectiveMode, setMode, employeeTz, timeZone, offsetLabel, format],
  );

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>;
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used inside TimezoneProvider');
  return ctx;
}
