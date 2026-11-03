"use strict";

const { randomBytes } = require("crypto");
const { Op, literal, fn, col } = require("sequelize");
const db = require("../models");
const AppError = require("../utils/AppError");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const calculateAge = (dateOfBirth) => {
  const date = dateOfBirth instanceof Date
    ? dateOfBirth.toISOString().slice(0, 10)
    : dateOfBirth;
  const birth = new Date(`${date}T00:00:00Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const birthdayHasPassed =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() >= birth.getUTCDate());
  if (!birthdayHasPassed) age -= 1;
  return age;
};

const generateIdentifier = (prefix) =>
  `${prefix}-${new Date().getUTCFullYear()}-${randomBytes(6).toString("hex").toUpperCase()}`;

const generatePatientIdentifier = () =>
  `UHID-${new Date().getUTCFullYear()}-${randomBytes(10).toString("hex").toUpperCase()}`;

const createPatientWithUniqueIdentifier = async (patientData, transaction) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await db.Patient.create(
        { ...patientData, uhid: generatePatientIdentifier() },
        { transaction },
      );
    } catch (error) {
      const duplicateUhid =
        error.name === "SequelizeUniqueConstraintError" &&
        (error.errors?.some((item) => item.path === "uhid") ||
          Object.hasOwn(error.fields || {}, "uhid"));
      if (!duplicateUhid || attempt === 4) throw error;
    }
  }
  throw new Error("Unable to generate a unique patient identifier.");
};

const getOwnedClinicIds = async (userId) => {
  const clinics = await db.Clinic.findAll({
    attributes: ["id"],
    where: { user_id: userId },
    raw: true,
  });
  return clinics.map(({ id }) => id);
};

const requireOwnedClinic = async (userId, clinicId, transaction) => {
  const clinic = await db.Clinic.findOne({
    attributes: ["id"],
    where: { id: clinicId, user_id: userId },
    transaction,
  });
  if (!clinic) throw AppError.notFound("Clinic not found");
  return clinic;
};

const getOwnedPatient = async (userId, patientId, options = {}) => {
  const clinicIds = await getOwnedClinicIds(userId);
  if (!clinicIds.length) throw AppError.notFound("Patient not found");
  const patient = await db.Patient.findOne({
    where: { id: patientId, clinic_id: { [Op.in]: clinicIds } },
    ...options,
  });
  if (!patient) throw AppError.notFound("Patient not found");
  return patient;
};

const getOwnedVisit = async (userId, patientId, visitId, options = {}) => {
  const patient = await getOwnedPatient(userId, patientId);
  const visit = await db.PatientVisit.findOne({
    where: { id: visitId, patient_id: patient.id, clinic_id: patient.clinic_id },
    ...options,
  });
  if (!visit) throw AppError.notFound("Visit not found");
  return visit;
};

const patientIncludes = [
  { model: db.PatientEmergencyContact, as: "emergencyContacts" },
  { model: db.PatientAllergy, as: "allergies" },
  { model: db.PatientCondition, as: "conditions" },
  { model: db.PatientDocument, as: "documents" },
  {
    model: db.PatientVisit,
    as: "visits",
    include: [
      { model: db.User, as: "doctor", attributes: ["id", "first_name", "last_name"] },
      { model: db.VisitDiagnosis, as: "diagnoses" },
      {
        model: db.Prescription,
        as: "prescriptions",
        include: [{ model: db.PrescriptionItem, as: "items" }],
      },
      { model: db.LabOrder, as: "labOrders" },
    ],
  },
];

const getAuthenticatedAssetUrl = (publicId, resourceType, format) => {
  if (!publicId) return null;
  return cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: "authenticated",
    resource_type: resourceType,
    ...(format ? { format } : {}),
  });
};

const toPatientResponse = (patient) => {
  const record = patient.get ? patient.get({ plain: true }) : patient;
  return {
    ...record,
    age: calculateAge(record.date_of_birth),
    profile_photo_url: getAuthenticatedAssetUrl(
      record.profile_photo_public_id,
      "image",
      record.profile_photo_format,
    ),
    ...(record.documents && {
      documents: record.documents.map((document) => {
        const documentResponse = { ...document };
        delete documentResponse.cloudinary_url;
        return {
          ...documentResponse,
          url: `/v1/patients/${document.patient_id}/documents/${document.id}/content`,
          download_url: `/v1/patients/${document.patient_id}/documents/${document.id}/content?download=true`,
        };
      }),
    }),
  };
};

const listPatients = async (userId, query) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const ownedClinicIds = await getOwnedClinicIds(userId);
  const clinicIds = query.clinic_id
    ? ownedClinicIds.filter((id) => id === Number(query.clinic_id))
    : ownedClinicIds;
  if (!clinicIds.length) {
    if (query.clinic_id) throw AppError.notFound("Clinic not found");
    return {
      success: true,
      data: [],
      pagination: { page, limit, total: 0, pages: 0 },
    };
  }

  const where = { clinic_id: { [Op.in]: clinicIds } };
  if (query.gender) where.gender = query.gender;
  if (query.blood_group) where.blood_group = query.blood_group;
  if (query.is_active !== undefined) {
    where.is_active =
      typeof query.is_active === "string"
        ? query.is_active.toLowerCase() === "true"
        : query.is_active;
  }
  if (query.registered_from || query.registered_to) {
    where.registration_date = {};
    if (query.registered_from) {
      where.registration_date[Op.gte] = query.registered_from;
    }
    if (query.registered_to) {
      where.registration_date[Op.lte] = query.registered_to;
    }
  }
  if (query.search) {
    const search = `%${query.search}%`;
    where[Op.or] = [
      { uhid: { [Op.like]: search } },
      { first_name: { [Op.like]: search } },
      { last_name: { [Op.like]: search } },
      { phone: { [Op.like]: search } },
      { email: { [Op.like]: search } },
    ];
  }

  const { count, rows } = await db.Patient.findAndCountAll({
    where,
    include: [
      {
        model: db.PatientVisit,
        as: "visits",
        attributes: [
          "id",
          "visit_date",
          "visit_type",
          "follow_up_date",
          "diagnosis_notes",
          "blood_pressure_systolic",
          "blood_pressure_diastolic",
          "status",
        ],
        limit: 1,
        separate: true,
        order: [["visit_date", "DESC"]],
      },
      {
        model: db.PatientCondition,
        as: "conditions",
        attributes: ["id", "condition_name", "status"],
        separate: true,
      },
    ],
    distinct: true,
    order: [["created_at", "DESC"]],
    limit,
    offset: (page - 1) * limit,
  });
  return {
    success: true,
    data: rows.map(toPatientResponse),
    pagination: {
      page,
      limit,
      total: count,
      pages: Math.ceil(count / limit),
    },
  };
};

const getPatientStats = async (userId, query) => {
  const ownedClinicIds = await getOwnedClinicIds(userId);
  const clinicIds = query.clinic_id
    ? ownedClinicIds.filter((id) => id === Number(query.clinic_id))
    : ownedClinicIds;
  if (query.clinic_id && !clinicIds.length) {
    throw AppError.notFound("Clinic not found");
  }
  if (!clinicIds.length) {
    return {
      success: true,
      data: {
        totalPatients: 0,
        revisitPatients: 0,
        chronicCarePatients: 0,
        visitsThisMonth: 0,
        monthlyVisits: [],
      },
    };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const nextMonthStart = new Date(monthStart);
  nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
  const trendStart = new Date(monthStart);
  trendStart.setMonth(trendStart.getMonth() - 5);

  const [
    totalPatients,
    revisitPatientRows,
    chronicCarePatients,
    visitsThisMonth,
    monthlyVisitRows,
  ] =
    await Promise.all([
      db.Patient.count({ where: { clinic_id: { [Op.in]: clinicIds } } }),
      db.PatientVisit.findAll({
        attributes: ["patient_id"],
        where: {
          clinic_id: { [Op.in]: clinicIds },
          status: { [Op.ne]: "cancelled" },
        },
        group: ["patient_id"],
        having: literal("COUNT(`PatientVisit`.`id`) > 1"),
        raw: true,
      }),
      db.PatientCondition.count({
        distinct: true,
        col: "patient_id",
        where: { status: "active" },
        include: [
          {
            model: db.Patient,
            as: "patient",
            attributes: [],
            required: true,
            where: { clinic_id: { [Op.in]: clinicIds } },
          },
        ],
      }),
      db.PatientVisit.count({
        where: {
          clinic_id: { [Op.in]: clinicIds },
          visit_date: { [Op.gte]: monthStart, [Op.lt]: nextMonthStart },
          status: { [Op.ne]: "cancelled" },
        },
      }),
      db.PatientVisit.findAll({
        attributes: [
          [fn("YEAR", col("visit_date")), "year"],
          [fn("MONTH", col("visit_date")), "month"],
          "visit_type",
          [fn("COUNT", col("id")), "count"],
        ],
        where: {
          clinic_id: { [Op.in]: clinicIds },
          visit_date: { [Op.gte]: trendStart, [Op.lt]: nextMonthStart },
          status: { [Op.ne]: "cancelled" },
        },
        group: [
          fn("YEAR", col("visit_date")),
          fn("MONTH", col("visit_date")),
          "visit_type",
        ],
        raw: true,
      }),
    ]);

  return {
    success: true,
    data: {
      totalPatients,
      revisitPatients: revisitPatientRows.length,
      chronicCarePatients,
      visitsThisMonth,
      monthlyVisits: monthlyVisitRows.map((row) => ({
        year: Number(row.year),
        month: Number(row.month),
        visitType: row.visit_type,
        count: Number(row.count),
      })),
    },
  };
};

const uploadBufferToCloudinary = (file, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      if (!result?.public_id) {
        return reject(new Error("Cloudinary returned an invalid upload response."));
      }
      resolve(result);
    });
    stream.end(file.buffer);
  });

const deleteCloudinaryAssets = async (assets) => {
  const results = await Promise.allSettled(
    assets.map(({ publicId, resourceType }) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        type: "authenticated",
        invalidate: true,
      }),
    ),
  );
  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Unable to clean up a Cloudinary upload.", result.reason);
    }
  });
};

const createPatient = async (userId, data, files = {}) => {
  const transaction = await db.sequelize.transaction();
  const uploadedAssets = [];
  try {
    await requireOwnedClinic(userId, data.clinic_id, transaction);
    const profilePhoto = files.profile_photo?.[0];
    const documents = files.documents || [];
    if ((profilePhoto || documents.length) && !isCloudinaryConfigured()) {
      throw new AppError(
        "Cloudinary media storage is not configured.",
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
      );
    }

    let profilePhotoResult = null;
    if (profilePhoto) {
      profilePhotoResult = await uploadBufferToCloudinary(profilePhoto, {
        folder: `medipulse/patients/${data.clinic_id}/profiles`,
        public_id: randomBytes(16).toString("hex"),
        resource_type: "image",
        type: "authenticated",
        overwrite: false,
      });
      uploadedAssets.push({
        publicId: profilePhotoResult.public_id,
        resourceType: profilePhotoResult.resource_type,
      });
    }

    const uploadedDocuments = [];
    for (const file of documents) {
      const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";
      const result = await uploadBufferToCloudinary(file, {
        folder: `medipulse/patients/${data.clinic_id}/documents`,
        public_id: randomBytes(16).toString("hex"),
        resource_type: resourceType,
        type: "authenticated",
        overwrite: false,
      });
      uploadedAssets.push({
        publicId: result.public_id,
        resourceType: result.resource_type,
      });
      uploadedDocuments.push({
        file_name:
          file.originalname
            .split(/[\\/]/)
            .pop()
            .replace(/[\u0000-\u001f]/g, "")
            .slice(0, 255) || "Medical document",
        mime_type: file.mimetype,
        file_size: file.size,
        cloudinary_public_id: result.public_id,
        cloudinary_url: result.secure_url || null,
        cloudinary_resource_type: result.resource_type,
        file_format: result.format || null,
      });
    }

    const patient = await createPatientWithUniqueIdentifier(
      {
        clinic_id: data.clinic_id,
        first_name: data.first_name,
        last_name: data.last_name,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        blood_group: data.blood_group || null,
        phone: data.phone,
        alternate_phone: data.alternate_phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        pin_code: data.pin_code || null,
        marital_status: data.marital_status || null,
        occupation: data.occupation || null,
        registration_date:
          data.registration_date || new Date().toISOString().slice(0, 10),
        notes: data.notes || null,
        profile_photo_public_id: profilePhotoResult?.public_id || null,
        profile_photo_format: profilePhotoResult?.format || null,
        current_medications: data.current_medications || [],
        previous_procedures: data.previous_procedures || [],
        smoking_habit: data.smoking_habit || null,
        alcohol_consumption: data.alcohol_consumption || null,
        exercise_frequency: data.exercise_frequency || null,
        is_active: data.is_active,
      },
      transaction,
    );

    if (data.emergency_contacts.length) {
      await db.PatientEmergencyContact.bulkCreate(
        data.emergency_contacts.map((contact) => ({
          ...contact,
          patient_id: patient.id,
        })),
        { transaction }
      );
    }
    if (data.allergies.length) {
      await db.PatientAllergy.bulkCreate(
        data.allergies.map((allergy) => ({
          ...allergy,
          patient_id: patient.id,
        })),
        { transaction }
      );
    }
    if (data.conditions.length) {
      await db.PatientCondition.bulkCreate(
        data.conditions.map((condition) => ({
          ...condition,
          patient_id: patient.id,
        })),
        { transaction }
      );
    }

    if (uploadedDocuments.length) {
      await db.PatientDocument.bulkCreate(
        uploadedDocuments.map((document) => ({
          ...document,
          patient_id: patient.id,
        })),
        { transaction },
      );
    }

    await patient.reload({
      include: [{ model: db.PatientDocument, as: "documents" }],
      transaction,
    });
    const responsePatient = toPatientResponse(patient);
    await transaction.commit();
    return {
      success: true,
      message: "Patient registered successfully",
      data: responsePatient,
    };
  } catch (error) {
    await transaction.rollback();
    await deleteCloudinaryAssets(uploadedAssets);
    throw error;
  }
};

const getPatient = async (userId, patientId) => {
  const patient = await getOwnedPatient(userId, patientId, {
    include: patientIncludes,
  });
  return { success: true, data: toPatientResponse(patient) };
};

const getPatientDocumentContent = async (
  userId,
  patientId,
  documentId,
  download = false,
) => {
  const patient = await getOwnedPatient(userId, patientId);
  const document = await db.PatientDocument.findOne({
    where: { id: documentId, patient_id: patient.id },
  });
  if (!document) throw AppError.notFound("Patient document not found");

  let cloudinaryResponse;
  try {
    const url = getAuthenticatedAssetUrl(
      document.cloudinary_public_id,
      document.cloudinary_resource_type,
      document.file_format,
    );
    cloudinaryResponse = await fetch(url);
    if (!cloudinaryResponse.ok) {
      throw new Error(`Cloudinary returned HTTP ${cloudinaryResponse.status}.`);
    }

    return {
      body: Buffer.from(await cloudinaryResponse.arrayBuffer()),
      fileName: document.file_name,
      mimeType: document.mime_type,
      disposition: download ? "attachment" : "inline",
    };
  } catch (error) {
    console.error("Unable to retrieve a patient document from Cloudinary.", error);
    throw new AppError(
      "Unable to retrieve the patient document from storage.",
      502,
      "DOCUMENT_STORAGE_ERROR",
    );
  }
};

const updatePatient = async (userId, patientId, data, files = {}) => {
  const transaction = await db.sequelize.transaction();
  const uploadedAssets = [];
  let replacedProfilePhoto = null;
  try {
    const patient = await getOwnedPatient(userId, patientId, { transaction });
    const profilePhoto = files.profile_photo?.[0];
    const documents = files.documents || [];
    if (documents.length) {
      const existingDocumentCount = await db.PatientDocument.count({
        where: { patient_id: patient.id },
        transaction,
      });
      if (existingDocumentCount + documents.length > 10) {
        throw AppError.badRequest("A patient can have up to 10 medical documents.");
      }
    }
    if ((profilePhoto || documents.length) && !isCloudinaryConfigured()) {
      throw new AppError(
        "Cloudinary media storage is not configured.",
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
      );
    }

    const patientUpdates = { ...data };
    if (profilePhoto) {
      const result = await uploadBufferToCloudinary(profilePhoto, {
        folder: `medipulse/patients/${patient.clinic_id}/profiles`,
        public_id: randomBytes(16).toString("hex"),
        resource_type: "image",
        type: "authenticated",
        overwrite: false,
      });
      uploadedAssets.push({
        publicId: result.public_id,
        resourceType: result.resource_type,
      });
      if (patient.profile_photo_public_id) {
        replacedProfilePhoto = {
          publicId: patient.profile_photo_public_id,
          resourceType: "image",
        };
      }
      patientUpdates.profile_photo_public_id = result.public_id;
      patientUpdates.profile_photo_format = result.format || null;
    }

    const uploadedDocuments = [];
    for (const file of documents) {
      const resourceType = file.mimetype === "application/pdf" ? "raw" : "image";
      const result = await uploadBufferToCloudinary(file, {
        folder: `medipulse/patients/${patient.clinic_id}/documents`,
        public_id: randomBytes(16).toString("hex"),
        resource_type: resourceType,
        type: "authenticated",
        overwrite: false,
      });
      uploadedAssets.push({
        publicId: result.public_id,
        resourceType: result.resource_type,
      });
      uploadedDocuments.push({
        file_name:
          file.originalname
            .split(/[\\/]/)
            .pop()
            .replace(/[\u0000-\u001f]/g, "")
            .slice(0, 255) || "Medical document",
        mime_type: file.mimetype,
        file_size: file.size,
        cloudinary_public_id: result.public_id,
        cloudinary_url: result.secure_url || null,
        cloudinary_resource_type: result.resource_type,
        file_format: result.format || null,
        patient_id: patient.id,
      });
    }

    await patient.update(patientUpdates, { transaction });
    if (uploadedDocuments.length) {
      await db.PatientDocument.bulkCreate(uploadedDocuments, { transaction });
    }
    await patient.reload({
      include: [{ model: db.PatientDocument, as: "documents" }],
      transaction,
    });
    const responsePatient = toPatientResponse(patient);
    await transaction.commit();

    if (replacedProfilePhoto) {
      await deleteCloudinaryAssets([replacedProfilePhoto]);
    }
    return {
      success: true,
      message: "Patient details updated successfully",
      data: responsePatient,
    };
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    await deleteCloudinaryAssets(uploadedAssets);
    throw error;
  }
};

const archivePatient = async (userId, patientId) => {
  const patient = await getOwnedPatient(userId, patientId);
  await patient.destroy();
  return { success: true, message: "Patient archived successfully" };
};

const listPatientVisits = async (userId, patientId) => {
  const patient = await getOwnedPatient(userId, patientId);
  const visits = await db.PatientVisit.findAll({
    where: { patient_id: patient.id, clinic_id: patient.clinic_id },
    include: [
      { model: db.User, as: "doctor", attributes: ["id", "first_name", "last_name"] },
      { model: db.VisitDiagnosis, as: "diagnoses" },
      {
        model: db.Prescription,
        as: "prescriptions",
        include: [{ model: db.PrescriptionItem, as: "items" }],
      },
      { model: db.LabOrder, as: "labOrders" },
    ],
    order: [["visit_date", "DESC"]],
  });
  return { success: true, data: visits };
};

const createVisit = async (userId, patientId, data) => {
  const patient = await getOwnedPatient(userId, patientId);
  const transaction = await db.sequelize.transaction();
  try {
    const visitData = { ...data };
    const diagnoses = visitData.diagnoses || [];
    delete visitData.diagnoses;
    const visit = await db.PatientVisit.create(
      {
        ...visitData,
        patient_id: patient.id,
        clinic_id: patient.clinic_id,
        doctor_id: userId,
        visit_number: generateIdentifier("VIS"),
        visit_date: visitData.visit_date || new Date(),
      },
      { transaction }
    );
    if (diagnoses.length) {
      await db.VisitDiagnosis.bulkCreate(
        diagnoses.map((diagnosis) => ({ ...diagnosis, visit_id: visit.id })),
        { transaction }
      );
    }
    await transaction.commit();
    return {
      success: true,
      message: "Visit created successfully",
      data: visit,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateVisit = async (userId, patientId, visitId, data) => {
  const visit = await getOwnedVisit(userId, patientId, visitId);
  const transaction = await db.sequelize.transaction();
  try {
    const visitData = { ...data };
    const diagnoses = visitData.diagnoses;
    delete visitData.diagnoses;
    if (Object.keys(visitData).length) await visit.update(visitData, { transaction });
    if (diagnoses) {
      await db.VisitDiagnosis.destroy({
        where: { visit_id: visit.id },
        transaction,
      });
      if (diagnoses.length) {
        await db.VisitDiagnosis.bulkCreate(
          diagnoses.map((diagnosis) => ({
            ...diagnosis,
            visit_id: visit.id,
          })),
          { transaction }
        );
      }
    }
    await transaction.commit();
    return {
      success: true,
      message: "Visit updated successfully",
      data: visit,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const archiveVisit = async (userId, patientId, visitId) => {
  const visit = await getOwnedVisit(userId, patientId, visitId);
  await visit.update({ status: "cancelled" });
  return { success: true, message: "Visit cancelled successfully" };
};

const findOwnedVisitById = async (userId, visitId) => {
  const clinicIds = await getOwnedClinicIds(userId);
  const visit = await db.PatientVisit.findOne({
    where: { id: visitId, clinic_id: { [Op.in]: clinicIds } },
  });
  if (!visit) throw AppError.notFound("Visit not found");
  return visit;
};

const createPrescription = async (userId, visitId, data) => {
  const visit = await findOwnedVisitById(userId, visitId);
  const transaction = await db.sequelize.transaction();
  try {
    const { items, ...prescriptionData } = data;
    const prescription = await db.Prescription.create(
      {
        ...prescriptionData,
        visit_id: visit.id,
        patient_id: visit.patient_id,
        doctor_id: userId,
        prescription_date: prescriptionData.prescription_date || new Date(),
      },
      { transaction }
    );
    await db.PrescriptionItem.bulkCreate(
      items.map((item) => ({
        ...item,
        prescription_id: prescription.id,
      })),
      { transaction }
    );
    const result = await db.Prescription.findByPk(prescription.id, {
      include: [{ model: db.PrescriptionItem, as: "items" }],
      transaction,
    });
    await transaction.commit();
    return {
      success: true,
      message: "Prescription created successfully",
      data: result,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const listPrescriptions = async (userId, visitId) => {
  const visit = await findOwnedVisitById(userId, visitId);
  const prescriptions = await db.Prescription.findAll({
    where: { visit_id: visit.id },
    include: [{ model: db.PrescriptionItem, as: "items" }],
    order: [["prescription_date", "DESC"]],
  });
  return { success: true, data: prescriptions };
};

const createLabOrders = async (userId, visitId, data) => {
  const visit = await findOwnedVisitById(userId, visitId);
  const transaction = await db.sequelize.transaction();
  let orders;
  try {
    orders = await db.LabOrder.bulkCreate(
      data.orders.map((order) => ({
        ...order,
        visit_id: visit.id,
        patient_id: visit.patient_id,
      })),
      { transaction }
    );
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  return {
    success: true,
    message: "Lab orders created successfully",
    data: orders,
  };
};

const getMedicalSummary = async (userId, patientId) => {
  const patient = await getOwnedPatient(userId, patientId, {
    include: [
      { model: db.PatientAllergy, as: "allergies" },
      { model: db.PatientCondition, as: "conditions" },
      { model: db.PatientEmergencyContact, as: "emergencyContacts" },
      { model: db.PatientDocument, as: "documents" },
    ],
  });
  const visits = await db.PatientVisit.findAll({
    where: { patient_id: patient.id, clinic_id: patient.clinic_id },
    include: [
      { model: db.User, as: "doctor", attributes: ["id", "first_name", "last_name"] },
      { model: db.VisitDiagnosis, as: "diagnoses" },
      {
        model: db.Prescription,
        as: "prescriptions",
        include: [{ model: db.PrescriptionItem, as: "items" }],
      },
      { model: db.LabOrder, as: "labOrders" },
    ],
    order: [["visit_date", "DESC"]],
  });
  const record = toPatientResponse(patient);
  return {
    success: true,
    data: {
      patient: record,
      age: record.age,
      allergies: record.allergies,
      conditions: record.conditions,
      emergencyContacts: record.emergencyContacts,
      visits,
      prescriptions: visits.flatMap((visit) => visit.prescriptions),
      labOrders: visits.flatMap((visit) => visit.labOrders),
    },
  };
};

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
