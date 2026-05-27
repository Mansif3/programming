import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pp_time_offset_ms";

export function getAppNow(): Date {
  const raw = localStorage.getItem(STORAGE_KEY);
  const offset = raw ? parseInt(raw, 10) : 0;
  return new Date(Date.now() + (isNaN(offset) ? 0 : offset));
}

export function setAppTimeOffset(date: Date) {
  const offset = date.getTime() - Date.now();
  localStorage.setItem(STORAGE_KEY, String(offset));
  window.dispatchEvent(new Event("pp-time-change"));
}

export function resetAppTime() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("pp-time-change"));
}

export function hasCustomTime(): boolean {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  const offset = parseInt(raw, 10);
  return !isNaN(offset) && Math.abs(offset) > 1000;
}

export function useAppTime(tickInterval = 1000) {
  const [now, setNow] = useState<Date>(() => getAppNow());

  const tick = useCallback(() => setNow(getAppNow()), []);

  useEffect(() => {
    const id = setInterval(tick, tickInterval);
    window.addEventListener("pp-time-change", tick);
    return () => {
      clearInterval(id);
      window.removeEventListener("pp-time-change", tick);
    };
  }, [tick, tickInterval]);

  return {
    now,
    setAppTime: setAppTimeOffset,
    resetAppTime,
    isCustom: hasCustomTime(),
  };
}
