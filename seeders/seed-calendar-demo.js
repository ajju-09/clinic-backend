"use strict";

require("dotenv").config();

const { Op } = require("sequelize");
const db = require("../models");
const { localDateTimeToUtc, zonedDateTimeToUtc } = require("../utils/calendarDateTime");

const DOCTOR_EMAIL = "doctor.demo3@example.test";
const DEMO_MARKER = "DEMO-CALENDAR";
const DEFAULT_TIMEZONE = "Asia/Kolkata";

const getDateKey = (offsetDays, timeZone) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const date = new Date(Date.UTC(
    Number(today.year),
    Number(today.month) - 1,
    Number(today.day) + offsetDays,
    12,
  ));
  return date.toISOString().slice(0, 10);
};

const eventFixtures = [
  {
    key: "completed-clinic",
    title: "DEMO-CALENDAR | General consultation block",
    offsetDays: -10,
    eventType: "clinic",
    colorKey: "blue",
    priority: "high",
    status: "completed",
    startTime: "09:00",
    endTime: "12:00",
    location: "Demo Surgical Care Clinic",
    description: "Synthetic completed clinic session for calendar display testing.",
    reminder: { enabled: true, time: "08:00", status: "sent", attempts: 1 },
  },
  {
    key: "failed-reminder",
    title: "DEMO-CALENDAR | Staff planning meeting",
    offsetDays: -4,
    eventType: "other",
    colorKey: "green",
    priority: "normal",
    status: "completed",
    startTime: "14:00",
    endTime: "15:00",
    location: "Demo Surgical Care Clinic",
    description: "Synthetic meeting with a failed reminder state for UI testing.",
    reminder: { enabled: true, time: "08:00", status: "failed", attempts: 3 },
  },
  {
    key: "today-clinic",
    title: "DEMO-CALENDAR | Clinic hours",
    offsetDays: 0,
    eventType: "clinic",
    colorKey: "blue",
    priority: "normal",
    status: "scheduled",
    startTime: "09:00",
    endTime: "17:00",
    location: "Demo Surgical Care Clinic",
    description: "Synthetic clinic hours. No patient information is included.",
  },
  {
    key: "personal-all-day",
    title: "DEMO-CALENDAR | Personal reminder",
    offsetDays: 1,
    eventType: "personal",
    colorKey: "purple",
    priority: "low",
    status: "scheduled",
    isAllDay: true,
    description: "Synthetic all-day personal reminder.",
  },
  {
    key: "outreach-reminder",
    title: "DEMO-CALENDAR | Community health camp",
    offsetDays: 3,
    eventType: "outreach",
    colorKey: "teal",
    priority: "high",
    status: "scheduled",
    startTime: "10:00",
    endTime: "14:00",
    location: "Demo Community Hall",
    description: "Synthetic outreach event with an upcoming email reminder.",
    reminder: { enabled: true, time: "08:00", status: "pending", attempts: 0 },
  },
  {
    key: "important-all-day",
    title: "DEMO-CALENDAR | Important clinic milestone",
    offsetDays: 7,
    eventType: "important",
    colorKey: "amber",
    priority: "high",
    status: "scheduled",
    isAllDay: true,
    location: "Demo Surgical Care Clinic",
    description: "Synthetic all-day important event with an upcoming email reminder.",
    reminder: { enabled: true, time: "07:30", status: "pending", attempts: 0 },
  },
  {
    key: "other-event",
    title: "DEMO-CALENDAR | Equipment maintenance",
    offsetDays: 12,
    eventType: "other",
    colorKey: "green",
    priority: "low",
    status: "scheduled",
    startTime: "16:00",
    endTime: "17:00",
    location: "Demo Surgical Care Clinic",
    description: "Synthetic event without an email reminder.",
  },
  {
    key: "cancelled-event",
    title: "DEMO-CALENDAR | Cancelled training session",
    offsetDays: 20,
    eventType: "personal",
    colorKey: "gray",
    priority: "normal",
    status: "cancelled",
    startTime: "11:00",
    endTime: "12:00",
    location: "Demo Training Room",
    description: "Synthetic cancelled event with its reminder job cancelled.",
    reminder: { enabled: true, time: "08:00", status: "cancelled", attempts: 0 },
  },
  {
    key: "future-clinic",
    title: "DEMO-CALENDAR | Follow-up clinic block",
    offsetDays: 28,
    eventType: "clinic",
    colorKey: "blue",
    priority: "normal",
    status: "scheduled",
    startTime: "09:30",
    endTime: "13:00",
    location: "Demo Surgical Care Clinic",
    description: "Synthetic future clinic block without a reminder.",
  },
];

const noteFixtures = [
  {
    key: "daily-plan",
    offsetDays: 0,
    note: "Review the clinic schedule and prepare the consultation rooms.",
  },
  {
    key: "outreach-prep",
    offsetDays: 3,
    note: "Confirm the synthetic outreach setup and event materials.",
  },
  {
    key: "monthly-review",
    offsetDays: 10,
    note: "Review the clinic calendar and plan next month's schedule.",
  },
];

async function ensureDevelopmentTarget() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Calendar demo seeding is permitted only with NODE_ENV=development.");
  }
  if (process.env.CONFIRM_CALENDAR_DEMO_SEED !== "YES") {
    throw new Error("Set CONFIRM_CALENDAR_DEMO_SEED=YES to confirm calendar demo seeding.");
  }
  if (!["localhost", "127.0.0.1", "::1"].includes(db.sequelize.config.host)) {
    throw new Error("Calendar demo seeding is restricted to a loopback development database.");
  }

  await db.sequelize.authenticate();
  const tables = await db.sequelize.getQueryInterface().showAllTables();
  const tableNames = new Set(tables.map((table) =>
    typeof table === "string" ? table : table.tableName,
  ));
  const requiredTables = [
    "clinics",
    "users",
    "calendar_events",
    "calendar_day_notes",
    "calendar_reminder_jobs",
  ];
  const missingTables = requiredTables.filter((table) => !tableNames.has(table));
  if (missingTables.length) {
    throw new Error(
      `Apply the database migrations before calendar seeding. Missing tables: ${missingTables.join(", ")}`,
    );
  }
}

async function findDemoClinic(userId, transaction) {
  const clinics = await db.Clinic.findAll({
    where: { user_id: userId },
    order: [["id", "ASC"]],
    transaction,
  });
  const demoClinic = clinics.find((clinic) => clinic.registration_no === "DEMO-CL-3");
  if (demoClinic) return demoClinic;
  if (clinics.length === 1) return clinics[0];
  if (!clinics.length) {
    throw new Error(`${DOCTOR_EMAIL} has no clinic. Run the development demo seeder first.`);
  }
  throw new Error(
    `Could not identify the demo clinic for ${DOCTOR_EMAIL}; expected registration number DEMO-CL-3.`,
  );
}

async function findOrCreateEvent(values, transaction) {
  let event = await db.CalendarEvent.findOne({
    where: {
      clinic_id: values.clinic_id,
      doctor_user_id: values.doctor_user_id,
      title: values.title,
    },
    transaction,
    paranoid: false,
  });
  if (event) {
    if (event.deleted_at) await event.restore({ transaction });
    await event.update(values, { transaction });
    return event;
  }
  return db.CalendarEvent.create(values, { transaction });
}

async function seedReminder(event, clinic, user, fixture, transaction) {
  const scheduledAt = zonedDateTimeToUtc(
    event.event_date,
    fixture.time,
    clinic.timezone || DEFAULT_TIMEZONE,
  );
  const idempotencyKey = `demo-calendar-reminder-${fixture.key}`;
  let job = await db.CalendarReminderJob.findOne({
    where: { idempotency_key: idempotencyKey },
    transaction,
  });
  const values = {
    event_id: event.id,
    recipient_email: user.email,
    scheduled_at_utc: scheduledAt,
    timezone: clinic.timezone || DEFAULT_TIMEZONE,
    status: fixture.status,
    attempts: fixture.attempts,
    last_attempt_at: fixture.status === "sent" || fixture.status === "failed"
      ? new Date(scheduledAt.getTime() + 30 * 60 * 1000)
      : null,
    sent_at: fixture.status === "sent" ? new Date(scheduledAt.getTime() + 5 * 60 * 1000) : null,
    last_error: fixture.status === "failed" ? "DEMO-CALENDAR: synthetic delivery failure." : null,
    claim_token: null,
  };
  if (!job) {
    await db.CalendarReminderJob.create({
      ...values,
      idempotency_key: idempotencyKey,
    }, { transaction });
    return;
  }

  const updates = {
    event_id: event.id,
    recipient_email: user.email,
    timezone: clinic.timezone || DEFAULT_TIMEZONE,
  };
  if (
    job.status === "pending" &&
    job.attempts === 0 &&
    !job.last_attempt_at &&
    !job.claim_token
  ) {
    updates.scheduled_at_utc = scheduledAt;
  }
  await job.update(updates, { transaction });
}

async function seedNotes(clinic, user, timeZone, transaction) {
  const markerPrefix = `${DEMO_MARKER}-NOTE:`;
  await db.CalendarDayNote.destroy({
    where: {
      clinic_id: clinic.id,
      doctor_user_id: user.id,
      note: { [Op.like]: `${markerPrefix}%` },
    },
    transaction,
  });
  for (const fixture of noteFixtures) {
    const noteDate = getDateKey(fixture.offsetDays, timeZone);
    const dateOwner = await db.CalendarDayNote.findOne({
      where: {
        clinic_id: clinic.id,
        doctor_user_id: user.id,
        note_date: noteDate,
      },
      transaction,
    });
    if (dateOwner) {
      throw new Error(
        `A daily note already exists on ${noteDate}; refusing to overwrite it.`,
      );
    }
    await db.CalendarDayNote.create({
      clinic_id: clinic.id,
      doctor_user_id: user.id,
      note_date: noteDate,
      note: `${markerPrefix}${fixture.key} ${fixture.note}`,
    }, { transaction });
  }
}

async function seedCalendarDemoData() {
  await ensureDevelopmentTarget();
  const transaction = await db.sequelize.transaction();
  try {
    const user = await db.User.findOne({
      where: { email: DOCTOR_EMAIL },
      transaction,
    });
    if (!user) {
      throw new Error(`${DOCTOR_EMAIL} was not found. Run the development demo seeder first.`);
    }
    if (!user.email_verified_at) {
      throw new Error(`${DOCTOR_EMAIL} must have a verified email to seed reminder jobs.`);
    }

    const clinic = await findDemoClinic(user.id, transaction);
    const timeZone = clinic.timezone || DEFAULT_TIMEZONE;
    const counts = { events: 0, notes: 0, reminderJobs: 0 };
    const existingDemoEvents = await db.CalendarEvent.findAll({
      where: {
        clinic_id: clinic.id,
        doctor_user_id: user.id,
        title: { [Op.like]: `${DEMO_MARKER} |%` },
      },
      attributes: ["id"],
      transaction,
      paranoid: false,
    });
    if (existingDemoEvents.length) {
      await db.CalendarReminderJob.destroy({
        where: {
          event_id: { [Op.in]: existingDemoEvents.map((event) => event.id) },
          idempotency_key: "demo-calendar-reminder-undefined",
        },
        transaction,
      });
    }

    for (const fixture of eventFixtures) {
      const eventDate = getDateKey(fixture.offsetDays, timeZone);
      const eventValues = {
        clinic_id: clinic.id,
        doctor_user_id: user.id,
        created_by: user.id,
        updated_by: user.id,
        title: fixture.title,
        description: `${DEMO_MARKER}: ${fixture.description}`,
        event_type: fixture.eventType,
        color_key: fixture.colorKey,
        location: fixture.location || null,
        event_date: eventDate,
        is_all_day: Boolean(fixture.isAllDay),
        start_at: fixture.startTime
          ? localDateTimeToUtc(`${eventDate}T${fixture.startTime}`, eventDate, timeZone)
          : null,
        end_at: fixture.endTime
          ? localDateTimeToUtc(`${eventDate}T${fixture.endTime}`, eventDate, timeZone)
          : null,
        priority: fixture.priority,
        status: fixture.status,
        reminder_enabled: Boolean(fixture.reminder),
        reminder_time: fixture.reminder?.time || null,
        reminder_email: fixture.reminder ? user.email : null,
      };
      const event = await findOrCreateEvent(eventValues, transaction);
      counts.events += 1;
      if (fixture.reminder) {
        await seedReminder(event, clinic, user, {
          ...fixture.reminder,
          key: fixture.key,
        }, transaction);
        counts.reminderJobs += 1;
      }
    }

    await seedNotes(clinic, user, timeZone, transaction);
    counts.notes = noteFixtures.length;

    await transaction.commit();
    console.log("Calendar demo data seeded successfully.");
    console.log(`Database: ${db.sequelize.config.database} on ${db.sequelize.config.host}`);
    console.log(`Account: ${DOCTOR_EMAIL}; clinic: ${clinic.name}; timezone: ${timeZone}`);
    console.log(`Records created or updated: ${JSON.stringify(counts)}`);
    console.log("All event titles and daily notes are marked as synthetic demo data.");
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

seedCalendarDemoData().catch((error) => {
  console.error("Calendar demo seeding failed:", error.message);
  process.exitCode = 1;
});
