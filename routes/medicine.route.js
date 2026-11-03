"use strict";

const express = require("express");
const route = express.Router();
const medicineController = require("../controllers/medicine.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const validation = require("../helper/medicineValidation");

route.use(authenticate);

route.get(
  "/",
  validationMiddleware(validation.clinicQuerySchema, "query"),
  medicineController.getMedicines,
);
route.post(
  "/",
  validationMiddleware(validation.createMedicineSchema),
  medicineController.createMedicine,
);
route.get(
  "/alerts",
  validationMiddleware(validation.clinicQuerySchema, "query"),
  medicineController.getMedicineAlerts,
);
route.get(
  "/history",
  validationMiddleware(validation.clinicQuerySchema, "query"),
  medicineController.getMedicineHistory,
);
route.get(
  "/:id",
  validationMiddleware(validation.idParamsSchema, "params"),
  medicineController.getMedicine,
);
route.put(
  "/:id",
  validationMiddleware(validation.idParamsSchema, "params"),
  validationMiddleware(validation.updateMedicineSchema),
  medicineController.updateMedicine,
);
route.delete(
  "/:id",
  validationMiddleware(validation.idParamsSchema, "params"),
  medicineController.deleteMedicine,
);
route.post(
  "/:id/batches",
  validationMiddleware(validation.idParamsSchema, "params"),
  validationMiddleware(validation.createBatchSchema),
  medicineController.addMedicineBatch,
);
route.post(
  "/:id/adjust-stock",
  validationMiddleware(validation.idParamsSchema, "params"),
  validationMiddleware(validation.adjustStockSchema),
  medicineController.adjustMedicineStock,
);

module.exports = route;
