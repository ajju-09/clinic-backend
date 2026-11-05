"use strict";

const { Op, literal } = require("sequelize");
const { randomUUID } = require("crypto");
const db = require("../models");
const AppError = require("../utils/AppError");
const {
  localDateTimeToUtc,
  utcDateToLocalTime,
  zonedDateTimeToUtc,
} = require("../utils/calendarDateTime");

const DEFAULT_TIMEZONE = process.env.APP_DEFAULT_TIMEZONE || "Asia/Kolkata";
const COLOR_BY_TYPE = {
  clinic: "blue",
  personal: "purple",
  outreach: "teal",
  important: "amber",
  other: "green",
};

const recordCalendarAudit = async ({
  action,
  entity,
  entityId,
  userId,
  details,
  transaction,
}) => {
  try {
    await db.AuditLog.create({
      action,
      entity,
      entity_id: entityId == null ? null : String(entityId),
      user_id: userId || null,
      details: details || null,
    }, { transaction });
  } catch (error) {
    console.error("[Calendar audit log failed]", {
      action,
      entity,
      entityId,
      code: error.code || "AUDIT_LOG_ERROR",
    });
  }
};

const requireOwnedClinic = async (userId, clinicId, transaction) => {
  const clinic = await db.Clinic.findOne({
    where: { id: clinicId, user_id: userId },
    attributes: ["id", "timezone"],
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!clinic) throw AppError.notFound("Clinic not found");
  return clinic;
};

const requireVerifiedEmail = (user) => {
  if (!user?.email || !user.email_verified_at) {
    throw AppError.unprocessable("Verify your account email before enabling reminders.");
  }
  return user.email.trim().toLowerCase();
};

const validateReminderRecipient = (recipientEmail, verifiedEmail) => {
  if (
    recipientEmail &&
    recipientEmail.trim().toLowerCase() !== verifiedEmail
  ) {
    throw AppError.unprocessable("Calendar reminders can only be sent to your verified account email.");
  }
};

const toDatabaseEventFields = (data, timezone, existing) => {
  const eventDate = data.eventDate || existing?.event_date;
  const isAllDay = data.isAllDay ?? Boolean(existing?.is_all_day);
  const startValue = Object.hasOwn(data, "startAt")
    ? data.startAt
    : existing?.start_at
      ? `${eventDate}T${utcDateToLocalTime(existing.start_at, timezone)}`
      : null;
  const endValue = Object.hasOwn(data, "endAt")
    ? data.endAt
    : existing?.end_at
      ? `${eventDate}T${utcDateToLocalTime(existing.end_at, timezone)}`
      : null;

  if (!isAllDay && !startValue) {
    throw AppError.unprocessable("A start time is required for timed events.");
  }

  let startAt = null;
  let endAt = null;
  try {
    if (!isAllDay && startValue) startAt = localDateTimeToUtc(startValue, eventDate, timezone);
    if (!isAllDay && endValue) endAt = localDateTimeToUtc(endValue, eventDate, timezone);
  } catch (error) {
    throw AppError.unprocessable(error.message);
  }
  if (startAt && endAt && endAt <= startAt) {
    throw AppError.unprocessable("End time must be after start time.");
  }

  const eventType = data.eventType || existing?.event_type;
  return {
    title: data.title ?? existing?.title,
    description: Object.hasOwn(data, "description")
      ? data.description || null
      : existing?.description,
    event_type: eventType,
    color_key: data.colorKey || existing?.color_key || COLOR_BY_TYPE[eventType],
    location: Object.hasOwn(data, "location")
      ? data.location || null
      : existing?.location,
    event_date: eventDate,
    start_at: startAt,
    end_at: endAt,
    is_all_day: isAllDay,
    priority: data.priority || existing?.priority || "normal",
    status: data.status || existing?.status || "scheduled",
  };
};

const toEventResponse = (event) => {
  const record = event.get ? event.get({ plain: true }) : event;
  const timezone = record.clinic?.timezone || DEFAULT_TIMEZONE;
  const reminderJob = record.reminderJobs?.[0] || null;
  const startTime = record.start_at ? utcDateToLocalTime(record.start_at, timezone) : null;
  const endTime = record.end_at ? utcDateToLocalTime(record.end_at, timezone) : null;
  const reminderTime = record.reminder_time
    ? String(record.reminder_time).slice(0, 5)
    : "08:00";

  return {
    id: record.id,
    clinicId: record.clinic_id,
    title: record.title,
    description: record.description,
    eventType: record.event_type,
    colorKey: record.color_key,
    location: record.location,
    eventDate: record.event_date,
    startAt: startTime ? `${record.event_date}T${startTime}:00` : null,
    endAt: endTime ? `${record.event_date}T${endTime}:00` : null,
    isAllDay: record.is_all_day,
    priority: record.priority,
    status: record.status,
    reminder: {
      enabled: record.reminder_enabled,
      time: reminderTime,
      recipientEmail: record.reminder_email,
      status: reminderJob?.status || (record.reminder_enabled ? "pending" : "off"),
    },
    reminderStatus: reminderJob?.status || (record.reminder_enabled ? "pending" : "off"),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

const eventIncludes = [
  { model: db.Clinic, as: "clinic", attributes: ["timezone"] },
  {
    model: db.CalendarReminderJob,
    as: "reminderJobs",
    attributes: ["status", "scheduled_at_utc", "created_at"],
    separate: true,
    limit: 1,
    order: [["created_at", "DESC"]],
  },
];

const getOwnedEvent = async (userId, eventId, transaction) => {
  const event = await db.CalendarEvent.findOne({
    where: { id: eventId, doctor_user_id: userId },
    include: eventIncludes,
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!event) throw AppError.notFound("Calendar event not found");
  return event;
};

const cancelPendingReminderJobs = async (eventId, transaction) => {
  const jobs = await db.CalendarReminderJob.findAll({
    where: { event_id: eventId, status: { [Op.in]: ["pending", "processing"] } },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (jobs.some((job) => job.status === "processing")) {
    throw AppError.conflict("This reminder is being delivered. Try again shortly.");
  }
  await db.CalendarReminderJob.update(
    { status: "cancelled" },
    { where: { event_id: eventId, status: "pending" }, transaction },
  );
};

const createReminderJob = async (event, clinic, user, transaction) => {
  const verifiedEmail = requireVerifiedEmail(user);
  validateReminderRecipient(event.reminder_email, verifiedEmail);
  const time = String(event.reminder_time || "08:00:00").slice(0, 5);
  let scheduledAt;
  try {
    scheduledAt = zonedDateTimeToUtc(event.event_date, time, clinic.timezone || DEFAULT_TIMEZONE);
  } catch (error) {
    throw AppError.unprocessable(error.message);
  }
  if (scheduledAt.getTime() <= Date.now()) {
    throw AppError.unprocessable("The reminder time must be in the future.");
  }
  return db.CalendarReminderJob.create({
    event_id: event.id,
    recipient_email: verifiedEmail,
    scheduled_at_utc: scheduledAt,
    timezone: clinic.timezone || DEFAULT_TIMEZONE,
    status: "pending",
    idempotency_key: `calendar-event-${event.id}-${randomUUID()}`,
  }, { transaction });
};

const syncReminderJob = async ({
  event,
  clinic,
  user,
  previousEnabled,
  transaction,
}) => {
  const jobs = await db.CalendarReminderJob.findAll({
    where: { event_id: event.id },
    order: [["created_at", "DESC"]],
    limit: 1,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const latest = jobs[0];
  const shouldEnable = event.reminder_enabled && event.status !== "cancelled";

  if (!shouldEnable) {
    await cancelPendingReminderJobs(event.id, transaction);
    return;
  }
  if (latest?.status === "processing") {
    throw AppError.conflict("This reminder is being delivered. Try again shortly.");
  }
  if (latest?.status === "sent") return;
  if (latest?.status === "pending") {
    const recipient = requireVerifiedEmail(user);
    validateReminderRecipient(event.reminder_email, recipient);
    let scheduledAt;
    try {
      scheduledAt = zonedDateTimeToUtc(
        event.event_date,
        String(event.reminder_time || "08:00:00").slice(0, 5),
        clinic.timezone || DEFAULT_TIMEZONE,
      );
    } catch (error) {
      throw AppError.unprocessable(error.message);
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw AppError.unprocessable("The reminder time must be in the future.");
    }
    await latest.update({
      recipient_email: recipient,
      scheduled_at_utc: scheduledAt,
      timezone: clinic.timezone || DEFAULT_TIMEZONE,
      last_error: null,
    }, { transaction });
    return;
  }
  if (!latest || (!previousEnabled && event.reminder_enabled)) {
    await createReminderJob(event, clinic, user, transaction);
  }
};

const listEvents = async (userId, query) => {
  const clinic = await requireOwnedClinic(userId, query.clinicId);
  const events = await db.CalendarEvent.findAll({
    where: {
      clinic_id: query.clinicId,
      doctor_user_id: userId,
      event_date: { [Op.between]: [query.startDate, query.endDate] },
    },
    include: eventIncludes,
    order: [["event_date", "ASC"], ["start_at", "ASC"], ["id", "ASC"]],
  });
  return {
    success: true,
    timezone: clinic.timezone || DEFAULT_TIMEZONE,
    data: events.map(toEventResponse),
  };
};

const getEvent = async (userId, eventId) => {
  const event = await getOwnedEvent(userId, eventId);
  return { success: true, data: toEventResponse(event) };
};

const createEvent = async (user, data) => {
  const result = await db.sequelize.transaction(async (transaction) => {
    const clinic = await requireOwnedClinic(user.id, data.clinicId, transaction);
    const fields = toDatabaseEventFields(data, clinic.timezone || DEFAULT_TIMEZONE);
    const reminder = data.reminder || { enabled: false };
    const reminderEnabled = Boolean(reminder.enabled) && fields.status !== "cancelled";
    const reminderEmail = reminderEnabled ? requireVerifiedEmail(user) : null;
    validateReminderRecipient(reminder.recipientEmail, reminderEmail);
    const event = await db.CalendarEvent.create({
      clinic_id: clinic.id,
      doctor_user_id: user.id,
      created_by: user.id,
      ...fields,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminder.time || "08:00" : null,
      reminder_email: reminderEmail,
    }, { transaction });
    if (event.reminder_enabled && event.status !== "cancelled") {
      await createReminderJob(event, clinic, user, transaction);
    }
    await recordCalendarAudit({
      action: "CREATE",
      entity: "calendar_event",
      entityId: event.id,
      userId: user.id,
      details: {
        clinicId: clinic.id,
        eventType: event.event_type,
        reminderEnabled: event.reminder_enabled,
      },
      transaction,
    });
    return event.id;
  });

  return {
    success: true,
    message: "Calendar event created successfully.",
    data: await getEvent(user.id, result).then((response) => response.data),
  };
};

const updateEvent = async (user, eventId, data) => {
  await db.sequelize.transaction(async (transaction) => {
    const event = await getOwnedEvent(user.id, eventId, transaction);
    const clinic = await requireOwnedClinic(user.id, event.clinic_id, transaction);
    const previousEnabled = event.reminder_enabled;
    const fields = toDatabaseEventFields(data, clinic.timezone || DEFAULT_TIMEZONE, event);
    const reminder = data.reminder || {
      enabled: event.reminder_enabled,
      time: event.reminder_time,
      recipientEmail: event.reminder_email,
    };
    const reminderEnabled = Boolean(reminder.enabled) && fields.status !== "cancelled";
    const reminderEmail = reminderEnabled ? requireVerifiedEmail(user) : null;
    validateReminderRecipient(reminder.recipientEmail, reminderEmail);
    await event.update({
      ...fields,
      updated_by: user.id,
      reminder_enabled: reminderEnabled,
      reminder_time: reminderEnabled ? reminder.time || event.reminder_time || "08:00" : null,
      reminder_email: reminderEmail,
    }, { transaction });
    await syncReminderJob({ event, clinic, user, previousEnabled, transaction });
    await recordCalendarAudit({
      action: "UPDATE",
      entity: "calendar_event",
      entityId: event.id,
      userId: user.id,
      details: {
        clinicId: clinic.id,
        eventType: event.event_type,
        status: event.status,
        reminderEnabled: event.reminder_enabled,
      },
      transaction,
    });
  });
  return {
    success: true,
    message: "Calendar event updated successfully.",
    data: await getEvent(user.id, eventId).then((response) => response.data),
  };
};

const deleteEvent = async (userId, eventId) => {
  await db.sequelize.transaction(async (transaction) => {
    const event = await getOwnedEvent(userId, eventId, transaction);
    await cancelPendingReminderJobs(event.id, transaction);
    await event.destroy({ transaction });
    await recordCalendarAudit({
      action: "DELETE",
      entity: "calendar_event",
      entityId: event.id,
      userId: userId,
      details: { clinicId: event.clinic_id },
      transaction,
    });
  });
  return { success: true, message: "Calendar event deleted successfully." };
};

const getDayNote = async (userId, clinicId, noteDate) => {
  await requireOwnedClinic(userId, clinicId);
  const note = await db.CalendarDayNote.findOne({
    where: { clinic_id: clinicId, doctor_user_id: userId, note_date: noteDate },
  });
  return {
    success: true,
    data: note
      ? { id: note.id, clinicId: note.clinic_id, date: note.note_date, note: note.note }
      : null,
  };
};

const saveDayNote = async (userId, clinicId, noteDate, text) => {
  const note = await db.sequelize.transaction(async (transaction) => {
    await requireOwnedClinic(userId, clinicId, transaction);
    await db.CalendarDayNote.upsert({
      clinic_id: clinicId,
      doctor_user_id: userId,
      note_date: noteDate,
      note: text,
    }, { transaction });
    await recordCalendarAudit({
      action: "SAVE",
      entity: "calendar_day_note",
      userId,
      details: { clinicId, date: noteDate },
      transaction,
    });
    return db.CalendarDayNote.findOne({
      where: { clinic_id: clinicId, doctor_user_id: userId, note_date: noteDate },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
  });
  return {
    success: true,
    message: "Daily note saved successfully.",
    data: { id: note.id, clinicId: note.clinic_id, date: note.note_date, note: note.note },
  };
};

const deleteDayNote = async (userId, clinicId, noteDate) => {
  await requireOwnedClinic(userId, clinicId);
  const note = await db.CalendarDayNote.findOne({
    where: { clinic_id: clinicId, doctor_user_id: userId, note_date: noteDate },
  });
  if (!note) throw AppError.notFound("Daily note not found");
  await note.destroy();
  await recordCalendarAudit({
    action: "DELETE",
    entity: "calendar_day_note",
    entityId: note.id,
    userId,
    details: { clinicId, date: noteDate },
  });
  return { success: true, message: "Daily note deleted successfully." };
};

const getReminder = async (userId, eventId) => {
  const event = await getOwnedEvent(userId, eventId);
  const response = toEventResponse(event);
  return { success: true, data: response.reminder };
};

const updateReminder = async (user, eventId, reminder) => {
  await updateEvent(user, eventId, { reminder });
  return getReminder(user.id, eventId);
};

const claimDueReminderJob = async (maxAttempts) => db.sequelize.transaction(async (transaction) => {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
  const staleJobs = await db.CalendarReminderJob.findAll({
    where: {
      status: "processing",
      last_attempt_at: { [Op.lte]: staleBefore },
    },
    limit: 25,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  for (const staleJob of staleJobs) {
    const exhausted = staleJob.attempts >= maxAttempts;
    await staleJob.update({
      status: exhausted ? "failed" : "pending",
      scheduled_at_utc: exhausted ? staleJob.scheduled_at_utc : new Date(),
      last_error: "WORKER_LEASE_EXPIRED",
      claim_token: null,
    }, { transaction });
    await recordCalendarAudit({
      action: exhausted ? "REMINDER_FAILED" : "REMINDER_RETRY",
      entity: "calendar_reminder_job",
      entityId: staleJob.id,
      details: { eventId: staleJob.event_id, reason: "WORKER_LEASE_EXPIRED" },
      transaction,
    });
  }

  const job = await db.CalendarReminderJob.findOne({
    where: {
      status: "pending",
      scheduled_at_utc: { [Op.lte]: literal("UTC_TIMESTAMP()") },
    },
    order: [["scheduled_at_utc", "ASC"], ["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!job) return null;
  const claimToken = randomUUID();
  await job.update({
    status: "processing",
    attempts: job.attempts + 1,
    last_attempt_at: new Date(),
    claim_token: claimToken,
  }, { transaction });
  return { id: job.id, claimToken };
});

const getClaimedJob = (jobId) => db.CalendarReminderJob.findByPk(jobId, {
  include: [{
    model: db.CalendarEvent,
    as: "event",
    include: [
      { model: db.Clinic, as: "clinic", attributes: ["timezone"] },
      { model: db.User, as: "owner", attributes: ["first_name", "last_name"] },
    ],
  }],
});

const finishReminderJob = async (jobId, claimToken, updates, audit = {}) => {
  const [updated] = await db.CalendarReminderJob.update(updates, {
    where: { id: jobId, status: "processing", claim_token: claimToken },
  });
  if (updated && audit.action) {
    await recordCalendarAudit({
      action: audit.action,
      entity: "calendar_reminder_job",
      entityId: jobId,
      userId: audit.userId,
      details: { eventId: audit.eventId },
    });
  }
};

const processReminderJob = async (jobId, claimToken, sendEmail, maxAttempts) => {
  const job = await getClaimedJob(jobId);
  if (!job || !job.event || job.event.status === "cancelled") {
    await finishReminderJob(jobId, claimToken, { status: "cancelled", claim_token: null }, {
      action: "REMINDER_CANCELLED",
      userId: job?.event?.doctor_user_id,
      eventId: job?.event_id,
    });
    return;
  }

  try {
    const event = job.event;
    await sendEmail({
      recipientEmail: job.recipient_email,
      doctorName: [event.owner?.first_name, event.owner?.last_name].filter(Boolean).join(" "),
      title: event.title,
      eventDate: event.event_date,
      startTime: event.start_at
        ? utcDateToLocalTime(event.start_at, job.timezone)
        : null,
      endTime: event.end_at
        ? utcDateToLocalTime(event.end_at, job.timezone)
        : null,
      location: event.location,
      description: event.description,
      timezone: job.timezone,
    });
    await finishReminderJob(jobId, claimToken, {
      status: "sent",
      sent_at: new Date(),
      last_error: null,
      claim_token: null,
    }, {
      action: "REMINDER_SENT",
      userId: event.doctor_user_id,
      eventId: event.id,
    });
  } catch (error) {
    const finalAttempt = job.attempts >= maxAttempts;
    const backoffMinutes = Math.min(60, 2 ** (job.attempts - 1));
    await finishReminderJob(jobId, claimToken, {
      status: finalAttempt ? "failed" : "pending",
      scheduled_at_utc: finalAttempt
        ? job.scheduled_at_utc
        : new Date(Date.now() + backoffMinutes * 60 * 1000),
      last_error: String(error.code || "EMAIL_DELIVERY_FAILED").slice(0, 120),
      claim_token: null,
    }, {
      action: finalAttempt ? "REMINDER_FAILED" : "REMINDER_RETRY",
      userId: job.event.doctor_user_id,
      eventId: job.event.id,
    });
    console.error("[Calendar reminder delivery failed]", {
      jobId,
      eventId: job.event_id,
      code: error.code || "EMAIL_DELIVERY_FAILED",
      finalAttempt,
    });
  }
};

const runDueReminderJobs = async (sendEmail, maxAttempts = 5, batchSize = 25) => {
  let processed = 0;
  for (; processed < batchSize; processed += 1) {
    const claimedJob = await claimDueReminderJob(maxAttempts);
    if (!claimedJob) break;
    await processReminderJob(
      claimedJob.id,
      claimedJob.claimToken,
      sendEmail,
      maxAttempts,
    );
  }
  return processed;
};

module.exports = {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  getDayNote,
  saveDayNote,
  deleteDayNote,
  getReminder,
  updateReminder,
  runDueReminderJobs,
  toEventResponse,
};
