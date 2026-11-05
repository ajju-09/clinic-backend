"use strict";

const express = require("express");
const route = express.Router();
const calendarController = require("../controllers/calendar.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createEventSchema,
  updateEventSchema,
  listEventsQuerySchema,
  clinicQuerySchema,
  eventIdParamSchema,
  dayNoteDateParamSchema,
  saveDayNoteSchema,
  reminderSchema,
} = require("../helper/calendarValidation");

route.use(authenticate);

route.get(
  "/events",
  validationMiddleware(listEventsQuerySchema, "query"),
  calendarController.listEvents,
);
route.post(
  "/events",
  validationMiddleware(createEventSchema),
  calendarController.createEvent,
);
route.get(
  "/events/:eventId",
  validationMiddleware(eventIdParamSchema, "params"),
  calendarController.getEvent,
);
route.patch(
  "/events/:eventId",
  validationMiddleware(eventIdParamSchema, "params"),
  validationMiddleware(updateEventSchema),
  calendarController.updateEvent,
);
route.delete(
  "/events/:eventId",
  validationMiddleware(eventIdParamSchema, "params"),
  calendarController.deleteEvent,
);

route.get(
  "/day-notes/:date",
  validationMiddleware(dayNoteDateParamSchema, "params"),
  validationMiddleware(clinicQuerySchema, "query"),
  calendarController.getDayNote,
);
route.put(
  "/day-notes/:date",
  validationMiddleware(dayNoteDateParamSchema, "params"),
  validationMiddleware(saveDayNoteSchema),
  calendarController.saveDayNote,
);
route.delete(
  "/day-notes/:date",
  validationMiddleware(dayNoteDateParamSchema, "params"),
  validationMiddleware(clinicQuerySchema, "query"),
  calendarController.deleteDayNote,
);

route.get(
  "/events/:eventId/reminder",
  validationMiddleware(eventIdParamSchema, "params"),
  calendarController.getReminder,
);
route.patch(
  "/events/:eventId/reminder",
  validationMiddleware(eventIdParamSchema, "params"),
  validationMiddleware(reminderSchema),
  calendarController.updateReminder,
);

module.exports = route;
