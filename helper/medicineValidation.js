"use strict";

const Joi = require("joi");

const idParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const clinicQuerySchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
});

const medicineFields = {
  name: Joi.string().trim().min(1).max(255),
  genericName: Joi.string().trim().max(255).allow("", null),
  form: Joi.string().trim().min(1).max(100),
  strength: Joi.string().trim().max(100).allow("", null),
  unit: Joi.string().trim().min(1).max(100),
  reorderLevel: Joi.number().integer().min(0).max(100000000),
};

const batchFields = {
  batchNo: Joi.string().trim().min(1).max(100).required(),
  quantity: Joi.number().integer().positive().max(100000000).required(),
  expiryDate: Joi.string().isoDate().required(),
  purchaseDate: Joi.string().isoDate().allow("", null),
  purchasePrice: Joi.number().min(0).precision(2).max(9999999999.99).default(0),
  supplier: Joi.string().trim().max(255).allow("", null),
};

const createMedicineSchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  initialBatch: Joi.object(batchFields).allow(null),
  ...medicineFields,
}).fork(["name", "form", "unit"], (schema) => schema.required());

const updateMedicineSchema = Joi.object(medicineFields).min(1);

const createBatchSchema = Joi.object(batchFields);

const adjustStockSchema = Joi.object({
  batchId: Joi.number().integer().positive().required(),
  type: Joi.string()
    .valid("PURCHASE", "CONSUME", "DISPENSE", "WASTAGE", "EXPIRED", "ADJUST")
    .required(),
  quantity: Joi.number().integer().min(-100000000).max(100000000).required(),
  reason: Joi.string().trim().max(2000).allow("", null),
}).custom((value, helpers) => {
  if (value.quantity === 0) return helpers.error("number.positive");
  if (value.type !== "ADJUST" && value.quantity < 0) {
    return helpers.error("number.positive");
  }
  return value;
});

module.exports = {
  idParamsSchema,
  clinicQuerySchema,
  createMedicineSchema,
  updateMedicineSchema,
  createBatchSchema,
  adjustStockSchema,
};
