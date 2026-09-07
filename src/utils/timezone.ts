export const DEFAULT_LEDGER_TIMEZONE = "Asia/Singapore";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const zonedParts = (date: Date, timeZone: string): ZonedParts => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

const zonedWallTimeToUtc = (
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date => {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);
  const parts = zonedParts(new Date(utcGuess), timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return new Date(utcGuess - (asUtc - utcGuess));
};

export const startOfZonedDay = (date: Date, timeZone: string): Date => {
  const parts = zonedParts(date, timeZone);
  return zonedWallTimeToUtc(parts.year, parts.month, parts.day, 0, 0, 0, timeZone);
};

export const addZonedDays = (
  date: Date,
  days: number,
  timeZone: string,
): Date => {
  const parts = zonedParts(date, timeZone);
  const shifted = Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0);
  return startOfZonedDay(new Date(shifted), timeZone);
};

export const endOfZonedDay = (date: Date, timeZone: string): Date => {
  const nextDay = addZonedDays(startOfZonedDay(date, timeZone), 1, timeZone);
  return new Date(nextDay.getTime() - 1);
};
