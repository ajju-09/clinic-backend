"use strict";

const express = require("express");
const route = express.Router();
const patientController = require("../controllers/patient.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const {
  visitIdParamsSchema,
  createPrescriptionSchema,
  createLabOrdersSchema,
} = require("../helper/patientValidation");

route.use(authenticate);

route.post(
  "/:visitId/prescriptions",
  validationMiddleware(visitIdParamsSchema, "params"),
  validationMiddleware(createPrescriptionSchema),
  patientController.createPrescription
);
route.get(
  "/:visitId/prescriptions",
  validationMiddleware(visitIdParamsSchema, "params"),
  patientController.listPrescriptions
);
route.post(
  "/:visitId/lab-orders",
  validationMiddleware(visitIdParamsSchema, "params"),
  validationMiddleware(createLabOrdersSchema),
  patientController.createLabOrders
);

module.exports = route;
