"use strict";

const Joi = require("joi");
const { parseDate, parseTime } = require("../utils/calendarDateTime");

const date = Joi.string()
  .custom((value, helpers) => parseDate(value) ? value : helpers.error("any.invalid"))
  .messages({ "any.invalid": "Date must be a real date in YYYY-MM-DD format." });
const time = Joi.string()
  .custom((value, helpers) => parseTime(value) ? value : helpers.error("any.invalid"))
  .messages({ "any.invalid": "Time must use HH:mm or HH:mm:ss format." });
const localDateTime = Joi.string().pattern(
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/,
);
const email = Joi.string().trim().lowercase().max(254).email({ tlds: { allow: true } });
const clinicId = Joi.number().integer().positive().required();
const eventId = Joi.number().integer().positive().required();

const eventFields = {
  title: Joi.string().trim().min(1).max(180),
  description: Joi.string().max(10000).allow("", null),
  eventType: Joi.string().valid("clinic", "personal", "outreach", "important", "other"),
  colorKey: Joi.string().valid("blue", "purple", "teal", "amber", "green", "gray"),
  location: Joi.string().trim().max(255).allow("", null),
  eventDate: date,
  startAt: localDateTime.allow(null),
  endAt: localDateTime.allow(null),
  isAllDay: Joi.boolean(),
  priority: Joi.string().valid("low", "normal", "high"),
  status: Joi.string().valid("scheduled", "cancelled", "completed"),
  reminder: Joi.object({
    enabled: Joi.boolean().required(),
    time: time.allow(null),
    recipientEmail: email.allow(null, ""),
  }),
};

const createEventSchema = Joi.object({
  ...eventFields,
  clinicId,
  title: eventFields.title.required(),
  eventType: eventFields.eventType.required(),
  eventDate: eventFields.eventDate.required(),
  isAllDay: eventFields.isAllDay.default(false),
  priority: eventFields.priority.default("normal"),
  reminder: eventFields.reminder.default({ enabled: false }),
}).custom((value, helpers) => {
  if (!value.isAllDay && !value.startAt) return helpers.error("any.invalid");
  if (value.startAt && !value.startAt.startsWith(`${value.eventDate}T`)) {
    return helpers.error("any.invalid");
  }
  if (value.endAt && value.startAt && value.endAt <= value.startAt) {
    return helpers.error("any.invalid");
  }
  return value;
}, "timed event start time validation");

const updateEventSchema = Joi.object(eventFields).min(1).custom((value, helpers) => {
  const isAllDay = value.isAllDay;
  if (isAllDay === false && value.startAt === null) return helpers.error("any.invalid");
  if (
    value.eventDate &&
    value.startAt &&
    !value.startAt.startsWith(`${value.eventDate}T`)
  ) return helpers.error("any.invalid");
  if (value.endAt && value.startAt && value.endAt <= value.startAt) {
    return helpers.error("any.invalid");
  }
  return value;
}, "event update validation");

const listEventsQuerySchema = Joi.object({
  clinicId,
  startDate: date.required(),
  endDate: date.required(),
}).custom((value, helpers) => {
  if (value.startDate > value.endDate) return helpers.error("any.invalid");
  const start = Date.parse(`${value.startDate}T00:00:00Z`);
  const end = Date.parse(`${value.endDate}T00:00:00Z`);
  if ((end - start) / 86400000 > 92) return helpers.error("any.invalid");
  return value;
}, "calendar date range validation");

const clinicQuerySchema = Joi.object({ clinicId });
const eventIdParamSchema = Joi.object({ eventId });
const dayNoteDateParamSchema = Joi.object({ date: date.required() });
const saveDayNoteSchema = Joi.object({
  clinicId,
  note: Joi.string().trim().min(1).max(10000).required(),
});
const reminderSchema = Joi.object({
  enabled: Joi.boolean().required(),
  time: time.allow(null),
  recipientEmail: email.allow(null, ""),
});

module.exports = {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  clinicQuerySchema,
  eventIdParamSchema,
  dayNoteDateParamSchema,
  saveDayNoteSchema,
  reminderSchema,
};
