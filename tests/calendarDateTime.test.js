"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  zonedDateTimeToUtc,
  localDateTimeToUtc,
} = require("../utils/calendarDateTime");
const {
  createEventSchema,
  listEventsQuerySchema,
} = require("../helper/calendarValidation");

test("converts clinic-local reminder times to UTC", () => {
  assert.equal(
    zonedDateTimeToUtc("2026-12-18", "08:00", "Asia/Kolkata").toISOString(),
    "2026-12-18T02:30:00.000Z",
  );
});

test("rejects invalid dates, local time mismatches, and nonexistent DST times", () => {
  assert.throws(() => zonedDateTimeToUtc("2026-02-30", "08:00", "Asia/Kolkata"));
  assert.throws(() => localDateTimeToUtc("2026-12-19T10:00", "2026-12-18", "Asia/Kolkata"));
  assert.throws(() => zonedDateTimeToUtc("2026-03-08", "02:30", "America/New_York"));
});

test("resolves valid local times across daylight-saving changes", () => {
  assert.equal(
    zonedDateTimeToUtc("2026-11-01", "01:30", "America/New_York").toISOString(),
    "2026-11-01T05:30:00.000Z",
  );
});

test("validates calendar event form and bounded date-range inputs", () => {
  const validEvent = {
    clinicId: 2,
    title: "Blood donation camp",
    eventType: "outreach",
    eventDate: "2026-12-18",
    startAt: "2026-12-18T10:00",
    endAt: "2026-12-18T14:00",
  };
  assert.equal(createEventSchema.validate(validEvent).error, undefined);
  assert.ok(createEventSchema.validate({
    ...validEvent,
    endAt: "2026-12-18T09:00",
  }).error);
  assert.ok(listEventsQuerySchema.validate({
    clinicId: 2,
    startDate: "2026-12-19",
    endDate: "2026-12-18",
  }).error);
});
