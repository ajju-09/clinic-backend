const express = require("express");
const cors = require("cors");
const errorHandler = require("./helper/errorHandler");
const { databaseConnection } = require("./helper/commonFunctions");
require("dotenv").config();
const calendarServices = require("./services/calendar.services");
const { sendCalendarReminderEmail } = require("./services/email.services");

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error("The CORS policy does not allow this origin");
    err.status = 403;
    return callback(err);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
};

databaseConnection();
app.use(cors(corsOptions));
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.use("/api/v1/user", require("./routes/user.route"));
app.use("/api/v1/clinics", require("./routes/clinic.route"));
app.use("/api/v1/patients", require("./routes/patient.route"));
app.use("/api/v1/visits", require("./routes/visit.route"));
app.use("/api/v1/expenses", require("./routes/expense.route"));
app.use("/api/v1/medicines", require("./routes/medicine.route"));
app.use("/api/v1/calendar", require("./routes/calendar.route"));

app.use(errorHandler);

let processingCalendarReminders = false;
const configuredPollInterval = Number(process.env.CALENDAR_REMINDER_POLL_INTERVAL_MS || 60000);
const configuredMaxAttempts = Number(process.env.CALENDAR_REMINDER_MAX_ATTEMPTS || 5);
if (process.env.NODE_ENV === "production") {
  const smtpConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;
  if (!smtpConfigured) {
    throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required in production.");
  }
}
try {
  new Intl.DateTimeFormat("en", {
    timeZone: process.env.APP_DEFAULT_TIMEZONE || "Asia/Kolkata",
  });
} catch {
  throw new Error("APP_DEFAULT_TIMEZONE must be a valid IANA timezone.");
}
if (!Number.isFinite(configuredPollInterval) || configuredPollInterval < 10000) {
  throw new Error("CALENDAR_REMINDER_POLL_INTERVAL_MS must be at least 10000.");
}
if (!Number.isInteger(configuredMaxAttempts) || configuredMaxAttempts < 1) {
  throw new Error("CALENDAR_REMINDER_MAX_ATTEMPTS must be a positive integer.");
}
const reminderPollInterval = configuredPollInterval;
const reminderMaxAttempts = configuredMaxAttempts;
const reminderTimer = setInterval(async () => {
  if (processingCalendarReminders) return;
  processingCalendarReminders = true;
  try {
    await calendarServices.runDueReminderJobs(sendCalendarReminderEmail, reminderMaxAttempts);
  } catch (error) {
    console.error("[Calendar reminder worker failed]", {
      code: error.code || "WORKER_ERROR",
      message: error.message,
    });
  } finally {
    processingCalendarReminders = false;
  }
}, reminderPollInterval);
reminderTimer.unref();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
