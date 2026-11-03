"use strict";

const asyncHandler = require("../utils/asyncHandler");
const patientServices = require("../services/patient.services");

const listPatients = asyncHandler(async (req, res) => {
  res.status(200).json(await patientServices.listPatients(req.user.id, req.query));
});

const getPatientStats = asyncHandler(async (req, res) => {
  res.status(200).json(await patientServices.getPatientStats(req.user.id, req.query));
});

const createPatient = asyncHandler(async (req, res) => {
  res.status(201).json(
    await patientServices.createPatient(req.user.id, req.body, req.files)
  );
});

const getPatient = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.getPatient(req.user.id, req.params.id)
  );
});

const getPatientDocumentContent = asyncHandler(async (req, res) => {
  const document = await patientServices.getPatientDocumentContent(
    req.user.id,
    req.params.id,
    req.params.documentId,
    req.query.download,
  );
  const encodedFileName = encodeURIComponent(document.fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  const fallbackFileName = document.fileName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");
  res
    .status(200)
    .set({
      "Content-Type": document.mimeType,
      "Content-Length": document.body.length,
      "Content-Disposition": `${document.disposition}; filename="${fallbackFileName}"; filename*=UTF-8''${encodedFileName}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    })
    .send(document.body);
});

const updatePatient = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.updatePatient(
      req.user.id,
      req.params.id,
      req.body,
      req.files,
    )
  );
});

const archivePatient = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.archivePatient(req.user.id, req.params.id)
  );
});

const listPatientVisits = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.listPatientVisits(req.user.id, req.params.id)
  );
});

const createVisit = asyncHandler(async (req, res) => {
  res.status(201).json(
    await patientServices.createVisit(
      req.user.id,
      req.params.id,
      req.body
    )
  );
});

const updateVisit = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.updateVisit(
      req.user.id,
      req.params.patientId,
      req.params.visitId,
      req.body
    )
  );
});

const archiveVisit = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.archiveVisit(
      req.user.id,
      req.params.patientId,
      req.params.visitId
    )
  );
});

const createPrescription = asyncHandler(async (req, res) => {
  res.status(201).json(
    await patientServices.createPrescription(
      req.user.id,
      req.params.visitId,
      req.body
    )
  );
});

const listPrescriptions = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.listPrescriptions(req.user.id, req.params.visitId)
  );
});

const createLabOrders = asyncHandler(async (req, res) => {
  res.status(201).json(
    await patientServices.createLabOrders(
      req.user.id,
      req.params.visitId,
      req.body
    )
  );
});

const getMedicalSummary = asyncHandler(async (req, res) => {
  res.status(200).json(
    await patientServices.getMedicalSummary(req.user.id, req.params.id)
  );
});

module.exports = {
  listPatients,
  getPatientStats,
  createPatient,
  getPatient,
  getPatientDocumentContent,
  updatePatient,
  archivePatient,
  listPatientVisits,
  createVisit,
  updateVisit,
  archiveVisit,
  createPrescription,
  listPrescriptions,
  createLabOrders,
  getMedicalSummary,
};
