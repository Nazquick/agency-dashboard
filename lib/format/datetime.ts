// Every date the UI shows is rendered in one fixed timezone and locale.
// Formatting with the runtime's defaults (toLocale*String(undefined, ...))
// gives a different string on the server (UTC, en-US) than in the browser
// (Oslo), which React reports as a hydration mismatch (error #418).
export const APP_TIME_ZONE = "Europe/Oslo";
const APP_LOCALE = "en-US";

type DateInput = string | number | Date;

export function formatDateTime(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleString(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE });
}

export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleDateString(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE });
}

export function formatTime(value: DateInput, options: Intl.DateTimeFormatOptions): string {
  return new Date(value).toLocaleTimeString(APP_LOCALE, { ...options, timeZone: APP_TIME_ZONE });
}
