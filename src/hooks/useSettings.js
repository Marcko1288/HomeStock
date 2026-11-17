import { useData } from "../app/DataProvider.jsx";
import { todayISO } from "../utils/date.js";

export function useSettings() {
  return useData().settings;
}

/** Opzioni per il calcolo degli stati: data di oggi (locale) e giorni "in scadenza". */
export function useStatusOptions() {
  const { settings } = useData();
  return { today: todayISO(), expiringDays: settings.expiringDays };
}
