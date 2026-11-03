"use strict";

const Joi = require("joi");

const optionalText = (max = 2000) => Joi.string().trim().max(max).allow(null, "");
const positiveId = Joi.number().integer().positive();
const patientFields = {
  first_name: Joi.string().trim().min(1).max(100),
  last_name: Joi.string().trim().min(1).max(100),
  date_of_birth: Joi.date().iso(),
  gender: Joi.string().trim().min(1).max(20),
  blood_group: Joi.string().trim().max(5).allow(null, ""),
  phone: Joi.string().trim().min(1).max(20),
  alternate_phone: Joi.string().trim().max(20).allow(null, ""),
  email: Joi.string().trim().email().max(255).allow(null, ""),
  address: optionalText(),
  city: Joi.string().trim().max(100).allow(null, ""),
  state: Joi.string().trim().max(100).allow(null, ""),
  pin_code: Joi.string().trim().max(20).allow(null, ""),
  marital_status: Joi.string().trim().max(30).allow(null, ""),
  occupation: Joi.string().trim().max(100).allow(null, ""),
  notes: optionalText(),
};

const emergencyContactSchema = Joi.object({
  contact_name: Joi.string().trim().min(1).max(150).required(),
  relationship: Joi.string().trim().max(50).allow(null, ""),
  phone: Joi.string().trim().min(1).max(20).required(),
  alternate_phone: Joi.string().trim().max(20).allow(null, ""),
});

const allergySchema = Joi.object({
  allergy_name: Joi.string().trim().min(1).max(150).required(),
  reaction: optionalText(),
  severity: Joi.string().valid("mild", "moderate", "severe").allow(null, ""),
  notes: optionalText(),
});

const conditionSchema = Joi.object({
  condition_name: Joi.string().trim().min(1).max(150).required(),
  diagnosed_date: Joi.date().iso().allow(null),
  status: Joi.string()
    .valid("active", "resolved", "under_observation")
    .default("active"),
  notes: optionalText(),
});

const medicationSchema = Joi.object({
  medicine_name: Joi.string().trim().min(1).max(255).required(),
  dosage: Joi.string().trim().max(100).allow(null, ""),
  frequency: Joi.string().trim().max(100).allow(null, ""),
  duration: Joi.string().trim().max(100).allow(null, ""),
  notes: optionalText(),
});

const previousProcedureSchema = Joi.object({
  record_name: Joi.string().trim().min(1).max(255).required(),
  record_type: Joi.string().valid("surgery", "injury", "other").required(),
  record_date: Joi.date().iso().allow(null),
  details: optionalText(),
});

const diagnosisSchema = Joi.object({
  diagnosis_name: Joi.string().trim().min(1).max(255).required(),
  diagnosis_code: Joi.string().trim().max(30).allow(null, ""),
  diagnosis_type: Joi.string().trim().max(30).allow(null, ""),
  notes: optionalText(),
});

const patientIdParamsSchema = Joi.object({
  id: positiveId.required(),
});

const patientDocumentParamsSchema = Joi.object({
  id: positiveId.required(),
  documentId: positiveId.required(),
});

const patientDocumentContentQuerySchema = Joi.object({
  download: Joi.boolean().default(false),
});

const visitIdParamsSchema = Joi.object({
  visitId: positiveId.required(),
});

const patientVisitParamsSchema = Joi.object({
  patientId: positiveId.required(),
  visitId: positiveId.required(),
});

const listPatientsQuerySchema = Joi.object({
  page: positiveId.default(1),
  limit: positiveId.max(100).default(20),
  search: Joi.string().trim().max(200).allow(""),
  clinic_id: positiveId,
  gender: Joi.string().trim().max(20),
  blood_group: Joi.string().trim().max(5),
  is_active: Joi.boolean(),
  registered_from: Joi.date().iso(),
  registered_to: Joi.date().iso(),
});

const patientStatsQuerySchema = Joi.object({
  clinic_id: positiveId,
});

const createPatientSchema = Joi.object({
  clinic_id: positiveId.required(),
  ...patientFields,
  first_name: patientFields.first_name.required(),
  last_name: patientFields.last_name.required(),
  date_of_birth: patientFields.date_of_birth.required(),
  gender: patientFields.gender.required(),
  phone: patientFields.phone.required(),
  registration_date: Joi.date().iso(),
  is_active: Joi.boolean().default(true),
  emergency_contacts: Joi.array().items(emergencyContactSchema).max(20).default([]),
  allergies: Joi.array().items(allergySchema).max(100).default([]),
  conditions: Joi.array().items(conditionSchema).max(100).default([]),
  current_medications: Joi.array().items(medicationSchema).max(100).default([]),
  previous_procedures: Joi.array().items(previousProcedureSchema).max(100).default([]),
  smoking_habit: Joi.string().valid("non_smoker", "former_smoker", "current_smoker").allow(null, ""),
  alcohol_consumption: Joi.string().valid("none", "occasional", "regular").allow(null, ""),
  exercise_frequency: Joi.string()
    .valid("none", "1-2 times per week", "2-3 times per week", "4-5 times per week", "daily")
    .allow(null, ""),
});

const updatePatientSchema = Joi.object(patientFields).min(1);

const visitFields = {
  visit_date: Joi.date().iso(),
  visit_type: Joi.string().valid("new", "follow_up", "emergency"),
  chief_complaint: optionalText(),
  symptoms: optionalText(),
  medical_history: optionalText(),
  examination_notes: optionalText(),
  temperature: Joi.number().min(0).max(100).allow(null),
  blood_pressure_systolic: Joi.number().integer().min(0).max(500).allow(null),
  blood_pressure_diastolic: Joi.number().integer().min(0).max(500).allow(null),
  pulse_rate: Joi.number().integer().min(0).max(1000).allow(null),
  respiratory_rate: Joi.number().integer().min(0).max(1000).allow(null),
  oxygen_saturation: Joi.number().min(0).max(100).allow(null),
  weight: Joi.number().min(0).max(1000).allow(null),
  height: Joi.number().min(0).max(300).allow(null),
  diagnosis_notes: optionalText(),
  treatment_plan: optionalText(),
  follow_up_date: Joi.date().iso().allow(null),
  doctor_notes: optionalText(),
  status: Joi.string().trim().max(30),
  diagnoses: Joi.array().items(diagnosisSchema).max(50),
};

const createVisitSchema = Joi.object({
  ...visitFields,
  visit_type: visitFields.visit_type.required(),
});

const updateVisitSchema = Joi.object(visitFields).min(1);

const prescriptionItemSchema = Joi.object({
  medicine_name: Joi.string().trim().min(1).max(255).required(),
  dosage: Joi.string().trim().max(100).allow(null, ""),
  frequency: Joi.string().trim().max(100).allow(null, ""),
  duration: Joi.string().trim().max(100).allow(null, ""),
  quantity: Joi.string().trim().max(50).allow(null, ""),
  route: Joi.string().trim().max(50).allow(null, ""),
  timing: Joi.string().trim().max(100).allow(null, ""),
  instructions: optionalText(),
});

const createPrescriptionSchema = Joi.object({
  prescription_date: Joi.date().iso(),
  instructions: optionalText(),
  notes: optionalText(),
  items: Joi.array().items(prescriptionItemSchema).min(1).max(100).required(),
});

const labOrderSchema = Joi.object({
  test_name: Joi.string().trim().min(1).max(255).required(),
  test_code: Joi.string().trim().max(30).allow(null, ""),
  instructions: optionalText(),
  result_notes: optionalText(),
});

const createLabOrdersSchema = Joi.object({
  orders: Joi.array().items(labOrderSchema).min(1).max(100).required(),
});

module.exports = {
  patientIdParamsSchema,
  patientDocumentParamsSchema,
  patientDocumentContentQuerySchema,
  visitIdParamsSchema,
  patientVisitParamsSchema,
  listPatientsQuerySchema,
  patientStatsQuerySchema,
  createPatientSchema,
  updatePatientSchema,
  createVisitSchema,
  updateVisitSchema,
  createPrescriptionSchema,
  createLabOrdersSchema,
};
