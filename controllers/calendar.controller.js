"use strict";

const asyncHandler = require("../utils/asyncHandler");
const calendarServices = require("../services/calendar.services");

exports.listEvents = asyncHandler(async (req, res) => {
  res.status(200).json(await calendarServices.listEvents(req.user.id, req.query));
});

exports.getEvent = asyncHandler(async (req, res) => {
  res.status(200).json(await calendarServices.getEvent(req.user.id, req.params.eventId));
});

exports.createEvent = asyncHandler(async (req, res) => {
  res.status(201).json(await calendarServices.createEvent(req.user, req.body));
});

exports.updateEvent = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.updateEvent(req.user, req.params.eventId, req.body),
  );
});

exports.deleteEvent = asyncHandler(async (req, res) => {
  res.status(200).json(await calendarServices.deleteEvent(req.user.id, req.params.eventId));
});

exports.getDayNote = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.getDayNote(req.user.id, req.query.clinicId, req.params.date),
  );
});

exports.saveDayNote = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.saveDayNote(
      req.user.id,
      req.body.clinicId,
      req.params.date,
      req.body.note,
    ),
  );
});

exports.deleteDayNote = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.deleteDayNote(
      req.user.id,
      req.query.clinicId,
      req.params.date,
    ),
  );
});

exports.getReminder = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.getReminder(req.user.id, req.params.eventId),
  );
});

exports.updateReminder = asyncHandler(async (req, res) => {
  res.status(200).json(
    await calendarServices.updateReminder(req.user, req.params.eventId, req.body),
  );
});
