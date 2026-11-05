"use strict";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

const parseDate = (date) => {
  const match = DATE_PATTERN.exec(date || "");
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (
    value.getUTCFullYear() !== year ||
    value.getUTCMonth() !== month - 1 ||
    value.getUTCDate() !== day
  ) return null;
  return { year, month, day };
};

const parseTime = (time) => {
  const match = TIME_PATTERN.exec(time || "");
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] || 0),
  };
};

const partsInTimeZone = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  );
};

const zonedDateTimeToUtc = (date, time, timeZone) => {
  const dateParts = parseDate(date);
  const timeParts = parseTime(time);
  if (!dateParts || !timeParts) {
    throw new TypeError("A valid local calendar date and time are required.");
  }
  if (typeof timeZone !== "string" || !timeZone.trim()) {
    throw new TypeError("A valid IANA timezone is required.");
  }

  const desired = {
    ...dateParts,
    ...timeParts,
  };
  const targetMilliseconds = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second,
  );

  let candidateMilliseconds = targetMilliseconds;
  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const actual = partsInTimeZone(new Date(candidateMilliseconds), timeZone);
      const actualMilliseconds = Date.UTC(
        actual.year,
        actual.month - 1,
        actual.day,
        actual.hour,
        actual.minute,
        actual.second,
      );
      const difference = targetMilliseconds - actualMilliseconds;
      if (difference === 0) break;
      candidateMilliseconds += difference;
    }

    const resolved = partsInTimeZone(new Date(candidateMilliseconds), timeZone);
    if (
      resolved.year !== desired.year ||
      resolved.month !== desired.month ||
      resolved.day !== desired.day ||
      resolved.hour !== desired.hour ||
      resolved.minute !== desired.minute ||
      resolved.second !== desired.second
    ) {
      throw new TypeError("The local time does not exist in the selected timezone.");
    }
  } catch (error) {
    if (error instanceof TypeError) throw error;
    throw new TypeError("A valid IANA timezone is required.");
  }

  return new Date(candidateMilliseconds);
};

const utcDateToLocalTime = (date, timeZone) => {
  const parts = partsInTimeZone(new Date(date), timeZone);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
};

const localDateTimeToUtc = (value, eventDate, timeZone) => {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)$/.exec(value || "");
  if (!match || match[1] !== eventDate) {
    throw new TypeError("Event times must be valid local times on the event date.");
  }
  return zonedDateTimeToUtc(match[1], match[2], timeZone);
};

module.exports = {
  parseDate,
  parseTime,
  zonedDateTimeToUtc,
  utcDateToLocalTime,
  localDateTimeToUtc,
};
