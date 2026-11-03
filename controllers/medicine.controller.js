"use strict";

const asyncHandler = require("../utils/asyncHandler");
const medicineServices = require("../services/medicine.services");

const getMedicines = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.getMedicinesService(req.user.id, req.query.clinicId),
  );
});

const createMedicine = asyncHandler(async (req, res) => {
  res.status(201).json(
    await medicineServices.createMedicineService(req.user.id, req.body),
  );
});

const getMedicine = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.getMedicineService(req.user.id, req.params.id),
  );
});

const updateMedicine = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.updateMedicineService(
      req.user.id,
      req.params.id,
      req.body,
    ),
  );
});

const deleteMedicine = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.deleteMedicineService(req.user.id, req.params.id),
  );
});

const addMedicineBatch = asyncHandler(async (req, res) => {
  res.status(201).json(
    await medicineServices.addMedicineBatchService(
      req.user.id,
      req.params.id,
      req.body,
    ),
  );
});

const adjustMedicineStock = asyncHandler(async (req, res) => {
  res.status(201).json(
    await medicineServices.adjustMedicineStockService(
      req.user.id,
      req.params.id,
      req.body,
    ),
  );
});

const getMedicineAlerts = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.getMedicineAlertsService(
      req.user.id,
      req.query.clinicId,
    ),
  );
});

const getMedicineHistory = asyncHandler(async (req, res) => {
  res.status(200).json(
    await medicineServices.getMedicineHistoryService(
      req.user.id,
      req.query.clinicId,
    ),
  );
});

module.exports = {
  getMedicines,
  createMedicine,
  getMedicine,
  updateMedicine,
  deleteMedicine,
  addMedicineBatch,
  adjustMedicineStock,
  getMedicineAlerts,
  getMedicineHistory,
};
