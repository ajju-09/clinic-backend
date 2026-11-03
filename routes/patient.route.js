"use strict";

const express = require("express");
const route = express.Router();
const patientController = require("../controllers/patient.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const validation = require("../helper/patientValidation");
const patientMediaUpload = require("../middleware/patient-media-upload.middleware");

route.use(authenticate);

route.get(
  "/",
  validationMiddleware(validation.listPatientsQuerySchema, "query"),
  patientController.listPatients
);
route.get(
  "/stats",
  validationMiddleware(validation.patientStatsQuerySchema, "query"),
  patientController.getPatientStats
);
route.post(
  "/",
  patientMediaUpload,
  validationMiddleware(validation.createPatientSchema),
  patientController.createPatient
);
route.get(
  "/:id/medical-summary",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  patientController.getMedicalSummary
);
route.get(
  "/:id/documents/:documentId/content",
  validationMiddleware(validation.patientDocumentParamsSchema, "params"),
  validationMiddleware(validation.patientDocumentContentQuerySchema, "query"),
  patientController.getPatientDocumentContent
);
route.get(
  "/:id/visits",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  patientController.listPatientVisits
);
route.post(
  "/:id/visits",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  validationMiddleware(validation.createVisitSchema),
  patientController.createVisit
);
route.put(
  "/:patientId/visits/:visitId",
  validationMiddleware(validation.patientVisitParamsSchema, "params"),
  validationMiddleware(validation.updateVisitSchema),
  patientController.updateVisit
);
route.delete(
  "/:patientId/visits/:visitId",
  validationMiddleware(validation.patientVisitParamsSchema, "params"),
  patientController.archiveVisit
);
route.get(
  "/:id",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  patientController.getPatient
);
route.put(
  "/:id",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  patientMediaUpload,
  validationMiddleware(validation.updatePatientSchema),
  patientController.updatePatient
);
route.delete(
  "/:id",
  validationMiddleware(validation.patientIdParamsSchema, "params"),
  patientController.archivePatient
);

module.exports = route;
