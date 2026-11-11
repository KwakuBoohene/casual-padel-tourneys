import { useThemeMode } from "../../app/ThemeProvider";
import accountsDay from "./assets/accounts-day.svg";
import accountsNight from "./assets/accounts-night.svg";
import activityDay from "./assets/activity-day.svg";
import activityNight from "./assets/activity-night.svg";
import brand from "./assets/brand.svg";
import calendarDay from "./assets/calendar-day.svg";
import calendarNight from "./assets/calendar-night.svg";
import chevronDay from "./assets/chevron-day.svg";
import chevronNight from "./assets/chevron-night.svg";
import externalDay from "./assets/external-day.svg";
import externalNight from "./assets/external-night.svg";
import healthDay from "./assets/health-day.svg";
import healthNight from "./assets/health-night.svg";
import overviewDay from "./assets/overview-day.svg";
import overviewNight from "./assets/overview-night.svg";
import themeDay from "./assets/theme-day.svg";
import themeNight from "./assets/theme-night.svg";
import tournamentsDay from "./assets/tournaments-day.svg";
import tournamentsNight from "./assets/tournaments-night.svg";

import viewerDay from "./assets/viewer-day.svg";
import viewerNight from "./assets/viewer-night.svg";

const icons = {
  viewer: [viewerDay, viewerNight],
  accounts: [accountsDay, accountsNight],
  activity: [activityDay, activityNight],
  brand: [brand, brand],
  calendar: [calendarDay, calendarNight],
  chevron: [chevronDay, chevronNight],
  external: [externalDay, externalNight],
  health: [healthDay, healthNight],
  overview: [overviewDay, overviewNight],
  theme: [themeDay, themeNight],
  tournaments: [tournamentsDay, tournamentsNight]
} as const;

export function AdminIcon({ name }: { name: keyof typeof icons }) {
  const { mode } = useThemeMode();
  return (
    <span className="inline-grid flex-[0_0_1.25rem] place-items-center" aria-hidden="true">
      <img src={icons[name][mode === "light" ? 0 : 1]} alt="" />
    </span>
  );
}
