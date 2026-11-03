"use strict";

require("dotenv").config();

const bcrypt = require("bcrypt");
const db = require("../models");
const { USER_ROLES, USER_STATUS } = require("../helper/constant");

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_SEED_MARKER = "DEMO-SEED";
const passwordHashRounds = 12;

const doctors = [
  {
    key: "001",
    username: "demo-doctor-1",
    first_name: "Asha",
    last_name: "Sample",
    email: "doctor.demo1@example.test",
    medical_registration_no: "DEMO-MR-0001",
    phone: "9000100001",
    gender: "Female",
    qualification: "MBBS, MD (General Medicine)",
    specialization: ["General Medicine", "Diagnostic"],
    experience_years: 12,
    profile_completion_status: "completed",
  },
  {
    key: "002",
    username: "demo-doctor-2",
    first_name: "Ravi",
    last_name: "Example",
    email: "doctor.demo2@example.test",
    medical_registration_no: null,
    phone: null,
    gender: "Male",
    qualification: null,
    specialization: [],
    experience_years: null,
    profile_completion_status: "incomplete",
  },
  {
    key: "003",
    username: "demo-doctor-3",
    first_name: "Noor",
    last_name: "Test",
    email: "doctor.demo3@example.test",
    medical_registration_no: "DEMO-MR-0003",
    phone: "9000100003",
    gender: "Others",
    qualification: "MBBS, MS (Surgery)",
    specialization: ["Surgery", "Medical Super-specialties"],
    experience_years: 7,
    profile_completion_status: "completed",
  },
];

const clinicTemplates = [
  {
    name: "Demo General Health Clinic",
    clinic_type: "General Practice",
    specialties: ["General Medicine", "Diagnostic"],
    city: "Pune",
    state: "Maharashtra",
  },
  {
    name: "Demo Family Care Center",
    clinic_type: "Family Clinic",
    specialties: ["Paediatrics", "General Medicine"],
    city: "Nagpur",
    state: "Maharashtra",
  },
  {
    name: "Demo Surgical Care Clinic",
    clinic_type: "Specialty Clinic",
    specialties: ["Surgery", "Rehabilitation"],
    city: "Nashik",
    state: "Maharashtra",
  },
];

const patientNames = [
  ["Taylor", "Example"],
  ["Jordan", "Sample"],
  ["Casey", "Demo"],
  ["Morgan", "Test"],
  ["Riley", "Example"],
  ["Avery", "Sample"],
  ["Cameron", "Demo"],
  ["Quinn", "Test"],
  ["Skyler", "Example"],
  ["Jamie", "Sample"],
  ["Drew", "Demo"],
  ["Robin", "Test"],
  ["Reese", "Example"],
  ["Alex", "Sample"],
  ["Emerson", "Demo"],
  ["Dakota", "Test"],
  ["Sage", "Example"],
  ["Parker", "Sample"],
];

const medicineTemplates = [
  { name: "Demo Paracetamol", generic_name: "Paracetamol", dosage_form: "Tablet", strength: "500 mg", unit: "tablet" },
  { name: "Demo Amoxicillin", generic_name: "Amoxicillin", dosage_form: "Capsule", strength: "500 mg", unit: "capsule" },
  { name: "Demo Oral Rehydration Salts", generic_name: "ORS", dosage_form: "Powder", strength: "21 g", unit: "sachet" },
  { name: "Demo Cetirizine", generic_name: "Cetirizine", dosage_form: "Tablet", strength: "10 mg", unit: "tablet" },
  { name: "Demo Salbutamol", generic_name: "Salbutamol", dosage_form: "Inhaler", strength: "100 mcg", unit: "inhaler" },
  { name: "Demo Antiseptic Solution", generic_name: "Povidone-iodine", dosage_form: "Solution", strength: "5%", unit: "bottle" },
];

const expenseCategories = [
  "cat-rent",
  "cat-salaries",
  "cat-medicines",
  "cat-equipment",
  "cat-utilities",
  "cat-maintenance",
  "cat-marketing",
  "cat-misc",
];
const paymentMethods = ["UPI", "CARD", "BANK_TRANSFER", "CASH", "OTHER"];
const movementTypes = ["CONSUME", "DISPENSE", "WASTAGE", "EXPIRED", "ADJUST", "PURCHASE"];
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const patientGenders = ["Female", "Male", "Others"];
const visitTypes = ["new", "follow_up", "emergency"];
const diagnoses = [
  { name: "Acute upper respiratory infection", code: "J06.9" },
  { name: "Essential hypertension", code: "I10" },
  { name: "Type 2 diabetes mellitus", code: "E11.9" },
  { name: "Acute gastritis", code: "K29.0" },
  { name: "Low back pain", code: "M54.5" },
  { name: "Allergic rhinitis", code: "J30.9" },
];

const dateOnly = (offsetDays = 0) => {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const dateOfBirth = (age, index) => {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age);
  date.setUTCMonth(index % 12, 5 + (index % 20));
  return date.toISOString().slice(0, 10);
};

async function findOrCreate(Model, where, values, transaction) {
  let record = await Model.findOne({
    where,
    transaction,
    paranoid: false,
  });
  if (record) {
    if (record.deleted_at) await record.restore({ transaction });
    await record.update(values, { transaction });
    return record;
  }
  record = await Model.create(values, { transaction });
  return record;
}

async function ensureDevelopmentTarget() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo seeding is permitted only with NODE_ENV=development.");
  }
  if (process.env.CONFIRM_DEMO_SEED !== "YES") {
    throw new Error("Set CONFIRM_DEMO_SEED=YES to confirm seeding the development database.");
  }

  const host = db.sequelize.config.host;
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("Demo seeding is restricted to a loopback development database.");
  }

  await db.sequelize.authenticate();
  const tables = await db.sequelize.getQueryInterface().showAllTables();
  const tableNames = new Set(tables.map((table) =>
    typeof table === "string" ? table : table.tableName,
  ));
  const requiredTables = [
    "users",
    "doctor_profiles",
    "clinics",
    "patients",
    "patient_emergency_contacts",
    "patient_allergies",
    "patient_conditions",
    "patient_visits",
    "visit_diagnoses",
    "prescriptions",
    "prescription_items",
    "lab_orders",
    "medicines",
    "medicine_batches",
    "stock_movements",
    "expenses",
    "audit_logs",
  ];
  const missingTables = requiredTables.filter((table) => !tableNames.has(table));
  if (missingTables.length) {
    throw new Error(
      `Run the current database migrations before seeding. Missing tables: ${missingTables.join(", ")}`,
    );
  }

  const doctorProfileColumns = await db.sequelize
    .getQueryInterface()
    .describeTable("doctor_profiles");
  if (!doctorProfileColumns.specialization || !doctorProfileColumns.qualification) {
    throw new Error(
      "Run the doctor specialization and qualification migration before seeding.",
    );
  }
}

async function seedDemoData() {
  await ensureDevelopmentTarget();
  const transaction = await db.sequelize.transaction();
  const counts = {
    users: 0,
    doctor_profiles: 0,
    clinics: 0,
    patients: 0,
    visits: 0,
    prescriptions: 0,
    medicines: 0,
    batches: 0,
    stock_movements: 0,
    expenses: 0,
  };

  try {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, passwordHashRounds);
    const seededDoctors = [];
    for (const [index, doctor] of doctors.entries()) {
      const user = await findOrCreate(
        db.User,
        { email: doctor.email },
        {
          username: doctor.username,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          password: hashedPassword,
          email: doctor.email,
          email_verified_at: new Date(),
          role: USER_ROLES.MD,
          status: USER_STATUS.ACTIVE,
          password_change_at: new Date(),
          is_login: false,
          is_verified: true,
        },
        transaction,
      );
      counts.users += 1;

      const profile = await findOrCreate(
        db.DoctorProfile,
        { user_id: user.id },
        {
          user_id: user.id,
          md_code: `MD-DEMO-${doctor.key}`,
          medical_registration_no: doctor.medical_registration_no,
          phone: doctor.phone,
          gender: doctor.gender,
          bio:
            index === 1
              ? null
              : `${DEMO_SEED_MARKER}: fictional test profile for ${doctor.first_name}.`,
          experience_years: doctor.experience_years,
          specialization: doctor.specialization,
          qualification: doctor.qualification,
          profile_completion_status: doctor.profile_completion_status,
          is_active: true,
        },
        transaction,
      );
      counts.doctor_profiles += 1;
      seededDoctors.push({ user, profile });
    }

    await findOrCreate(
      db.User,
      { email: "admin.demo@example.test" },
      {
        username: "demo-admin",
        first_name: "Admin",
        last_name: "Demo",
        password: hashedPassword,
        email: "admin.demo@example.test",
        email_verified_at: new Date(),
        role: USER_ROLES.ADMIN,
        status: USER_STATUS.ACTIVE,
        password_change_at: new Date(),
        is_login: false,
        is_verified: true,
      },
      transaction,
    );
    counts.users += 1;

    for (const [key, status] of [
      ["pending", USER_STATUS.PENDING],
      ["suspended", USER_STATUS.SUSPENDED],
    ]) {
      await findOrCreate(
        db.User,
        { email: `doctor.${key}@example.test` },
        {
          username: `demo-${key}`,
          first_name: "Status",
          last_name: key === "pending" ? "Pending" : "Suspended",
          password: hashedPassword,
          email: `doctor.${key}@example.test`,
          role: USER_ROLES.MD,
          status,
          is_login: false,
          is_verified: key === "suspended",
        },
        transaction,
      );
      counts.users += 1;
    }

    const clinics = [];
    for (const [index, template] of clinicTemplates.entries()) {
      const doctor = seededDoctors[index];
      const clinic = await findOrCreate(
        db.Clinic,
        { user_id: doctor.user.id, registration_no: `DEMO-CL-${index + 1}` },
        {
          user_id: doctor.user.id,
          name: template.name,
          clinic_type: template.clinic_type,
          specialties: template.specialties,
          description: `${DEMO_SEED_MARKER}: synthetic clinic for development testing.`,
          registration_no: `DEMO-CL-${index + 1}`,
          phone: `90000000${String(index + 1).padStart(2, "0")}`,
          alternate_phone: null,
          email: `clinic.demo${index + 1}@example.test`,
          website: null,
          address: `${index + 10} Example Road`,
          address_line_2: null,
          city: template.city,
          state: template.state,
          pin_code: `41100${index + 1}`,
          working_hours: "Mon-Sat 09:00-18:00",
        },
        transaction,
      );
      clinics.push({ clinic, doctor });
      counts.clinics += 1;
    }

    const patients = [];
    for (const [index, name] of patientNames.entries()) {
      const clinicIndex = index % clinics.length;
      const { clinic } = clinics[clinicIndex];
      const age = [0, 4, 17, 26, 34, 45, 58, 67, 82][index % 9];
      const patient = await findOrCreate(
        db.Patient,
        { uhid: `DEMO-2026-${String(index + 1).padStart(4, "0")}` },
        {
          clinic_id: clinic.id,
          uhid: `DEMO-2026-${String(index + 1).padStart(4, "0")}`,
          first_name: name[0],
          last_name: name[1],
          date_of_birth: dateOfBirth(age, index),
          gender: patientGenders[index % patientGenders.length],
          blood_group: index % 7 === 0 ? null : bloodGroups[index % bloodGroups.length],
          phone: `900001${String(index).padStart(4, "0")}`,
          alternate_phone: index % 3 === 0 ? `900002${String(index).padStart(4, "0")}` : null,
          email: `patient.demo${String(index + 1).padStart(3, "0")}@example.test`,
          address: `${index + 1} Sample Street`,
          city: clinics[clinicIndex].clinic.city,
          state: clinics[clinicIndex].clinic.state,
          pin_code: `411${String(index).padStart(3, "0")}`,
          marital_status: age < 18 ? null : ["single", "married", "widowed"][index % 3],
          occupation: age < 18 ? "Student" : ["Teacher", "Engineer", "Retired", "Self-employed"][index % 4],
          registration_date: dateOnly(-index * 4),
          notes: `${DEMO_SEED_MARKER}: synthetic patient record for development testing.`,
          current_medications:
            index % 4 === 0
              ? [{ medicine_name: "Demo Paracetamol", dosage: "500 mg", frequency: "As needed" }]
              : [],
          previous_procedures:
            index % 5 === 0
              ? [{ record_name: "Demo appendectomy", record_type: "surgery", record_date: dateOnly(-900) }]
              : [],
          smoking_habit: ["non_smoker", "former_smoker", "current_smoker"][index % 3],
          alcohol_consumption: ["none", "occasional", "regular"][index % 3],
          exercise_frequency: ["none", "1-2 times per week", "2-3 times per week", "4-5 times per week", "daily"][index % 5],
          is_active: index % 11 !== 0,
        },
        transaction,
      );
      patients.push({ patient, clinic, doctor: clinics[clinicIndex].doctor, index });
      counts.patients += 1;

      await findOrCreate(
        db.PatientEmergencyContact,
        {
          patient_id: patient.id,
          contact_name: `${DEMO_SEED_MARKER}: ${name[0]} ${name[1]} Contact`,
        },
        {
          patient_id: patient.id,
          contact_name: `${DEMO_SEED_MARKER}: ${name[0]} ${name[1]} Contact`,
          relationship: age < 18 ? "Parent/Guardian" : "Family",
          phone: `900003${String(index).padStart(4, "0")}`,
          alternate_phone: null,
        },
        transaction,
      );

      if (index % 3 === 0) {
        await findOrCreate(
          db.PatientAllergy,
          { patient_id: patient.id, allergy_name: "Demo penicillin allergy" },
          {
            patient_id: patient.id,
            allergy_name: "Demo penicillin allergy",
            reaction: "Synthetic test data: rash",
            severity: ["mild", "moderate", "severe"][index % 3],
            notes: `${DEMO_SEED_MARKER}: fictional allergy for UI testing.`,
          },
          transaction,
        );
      }

      const conditionStatus = ["active", "resolved", "under_observation"][index % 3];
      await findOrCreate(
        db.PatientCondition,
        { patient_id: patient.id, condition_name: `Demo condition ${index + 1}` },
        {
          patient_id: patient.id,
          condition_name: `Demo condition ${index + 1}`,
          diagnosed_date: dateOnly(-index * 14),
          status: conditionStatus,
          notes: `${DEMO_SEED_MARKER}: synthetic condition.`,
        },
        transaction,
      );
    }

    const visits = [];
    for (const { patient, clinic, doctor, index } of patients) {
      for (let visitIndex = 0; visitIndex < 3; visitIndex += 1) {
        const offsets = [-30 - index, -7 - index, 7 + (index % 10)];
        const visitDate = new Date();
        visitDate.setUTCHours(9 + visitIndex * 2, 30, 0, 0);
        visitDate.setUTCDate(visitDate.getUTCDate() + offsets[visitIndex]);
        const visitNumber = `D26-${clinic.id}-${index + 1}-${visitIndex + 1}`;
        const visitType = visitTypes[(index + visitIndex) % visitTypes.length];
        const status =
          visitIndex === 2
            ? "scheduled"
            : index % 9 === 0 && visitIndex === 1
              ? "cancelled"
              : index % 7 === 0 && visitIndex === 0
                ? "in_progress"
                : "completed";
        const visit = await findOrCreate(
          db.PatientVisit,
          { clinic_id: clinic.id, visit_number: visitNumber },
          {
            patient_id: patient.id,
            clinic_id: clinic.id,
            doctor_id: doctor.user.id,
            visit_number: visitNumber,
            visit_date: visitDate,
            visit_type: visitType,
            chief_complaint: ["Fever and cough", "Routine follow-up", "Abdominal discomfort"][visitIndex],
            symptoms: "Synthetic test symptoms; not clinical advice.",
            medical_history: "Demo history only.",
            examination_notes: "Fictional examination notes for testing.",
            temperature: index % 2 === 0 ? "37.20" : "38.10",
            blood_pressure_systolic: 110 + (index % 8) * 5,
            blood_pressure_diastolic: 70 + (index % 5) * 3,
            pulse_rate: 68 + (index % 20),
            respiratory_rate: 14 + (index % 6),
            oxygen_saturation: index % 10 === 0 ? "91.00" : "98.00",
            weight: (45 + index * 2).toFixed(2),
            height: (145 + index * 1.5).toFixed(2),
            diagnosis_notes: "Synthetic diagnosis summary.",
            treatment_plan: "Review symptoms and follow up as needed.",
            follow_up_date: visitIndex === 0 ? dateOnly(14 + index % 10) : null,
            doctor_notes: `${DEMO_SEED_MARKER}: visit data.`,
            status,
          },
          transaction,
        );
        visits.push({ visit, patient, clinic, doctor, index, visitIndex });
        counts.visits += 1;

        const diagnosis = diagnoses[(index + visitIndex) % diagnoses.length];
        await findOrCreate(
          db.VisitDiagnosis,
          { visit_id: visit.id, diagnosis_code: diagnosis.code },
          {
            visit_id: visit.id,
            diagnosis_name: diagnosis.name,
            diagnosis_code: diagnosis.code,
            diagnosis_type: visitType,
            notes: `${DEMO_SEED_MARKER}: synthetic diagnosis.`,
          },
          transaction,
        );

        if ((index + visitIndex) % 2 === 0) {
          const labStatus = ["ordered", "in_progress", "completed", "cancelled"][(index + visitIndex) % 4];
          await findOrCreate(
            db.LabOrder,
            { visit_id: visit.id, test_code: `DEMO-LAB-${index}-${visitIndex}` },
            {
              visit_id: visit.id,
              patient_id: patient.id,
              test_name: ["Complete blood count", "Blood glucose", "Lipid profile", "Urinalysis"][(index + visitIndex) % 4],
              test_code: `DEMO-LAB-${index}-${visitIndex}`,
              instructions: "Synthetic laboratory test.",
              status: labStatus,
              ordered_at: visitDate,
              completed_at: labStatus === "completed" ? visitDate : null,
              result_notes: labStatus === "completed" ? "Synthetic result: within reference range." : null,
              report_url: null,
            },
            transaction,
          );
        }
      }
    }

    for (const { visit, patient, doctor, index, visitIndex } of visits) {
      if (visitIndex !== 0 || index % 2 !== 0) continue;

      const prescription = await findOrCreate(
        db.Prescription,
        {
          visit_id: visit.id,
          notes: `${DEMO_SEED_MARKER}-PRESCRIPTION-${index}`,
        },
        {
          visit_id: visit.id,
          patient_id: patient.id,
          doctor_id: doctor.user.id,
          prescription_date: visit.visit_date,
          instructions: "Synthetic demo prescription; not for medical use.",
          notes: `${DEMO_SEED_MARKER}-PRESCRIPTION-${index}`,
        },
        transaction,
      );
      counts.prescriptions += 1;

      for (const [itemIndex, medicine] of medicineTemplates.slice(0, 2).entries()) {
        await findOrCreate(
          db.PrescriptionItem,
          { prescription_id: prescription.id, medicine_name: medicine.generic_name },
          {
            prescription_id: prescription.id,
            medicine_name: medicine.generic_name,
            dosage: itemIndex === 0 ? "1 tablet" : "1 capsule",
            frequency: itemIndex === 0 ? "Every 8 hours as needed" : "Twice daily",
            duration: "5 days",
            quantity: "10",
            route: "Oral",
            timing: itemIndex === 0 ? "After food" : "Morning and evening",
            instructions: "Synthetic instruction for development testing.",
          },
          transaction,
        );
      }
    }

    const batches = [];
    for (const [clinicIndex, { clinic, doctor }] of clinics.entries()) {
      for (const [medicineIndex, template] of medicineTemplates.entries()) {
        const medicine = await findOrCreate(
          db.Medicine,
          { clinic_id: clinic.id, name: template.name },
          {
            clinic_id: clinic.id,
            created_by: doctor.user.id,
            ...template,
            reorder_level: medicineIndex === 0 ? 10 : 20,
          },
          transaction,
        );
        counts.medicines += 1;

        const batchTemplates = [
          { suffix: "A", quantity: medicineIndex === 0 ? 2 : 70, expiry: 365 },
          { suffix: "B", quantity: medicineIndex === 0 ? 1 : 35, expiry: 21 },
          { suffix: "C", quantity: 4, expiry: -8, purchase: 12 },
        ];
        for (const [batchIndex, batchTemplate] of batchTemplates.entries()) {
          const batchNo = `DEMO-${clinicIndex + 1}-${medicineIndex + 1}-${batchTemplate.suffix}`;
          const movementType =
            batchIndex === 0 && medicineIndex < movementTypes.length
              ? movementTypes[medicineIndex]
              : null;
          const adjustment =
            movementType === "ADJUST"
              ? 2
              : movementType === "PURCHASE"
                ? 4
                : movementType
                  ? -2
                  : 0;
          const purchaseQuantity =
            batchTemplate.purchase ?? batchTemplate.quantity - adjustment;
          const batch = await findOrCreate(
            db.MedicineBatch,
            { medicine_id: medicine.id, batch_no: batchNo },
            {
              medicine_id: medicine.id,
              batch_no: batchNo,
              quantity: purchaseQuantity,
              expiry_date: dateOnly(batchTemplate.expiry),
              purchase_date: dateOnly(-60 - batchIndex * 15),
              purchase_price: (50 + medicineIndex * 12).toFixed(2),
              supplier: "Demo Sample Supplier",
            },
            transaction,
          );
          batches.push({ batch, medicine, clinic, doctor, batchIndex, medicineIndex, purchaseQuantity });
          counts.batches += 1;
        }
      }
    }

    for (const [index, { batch, medicine, clinic, doctor, batchIndex, medicineIndex, purchaseQuantity }] of batches.entries()) {
      const purchaseReason = `${DEMO_SEED_MARKER}: initial batch ${batch.batch_no}`;
      await findOrCreate(
        db.StockMovement,
        {
          batch_id: batch.id,
          movement_type: "PURCHASE",
          reason: purchaseReason,
        },
        {
          clinic_id: clinic.id,
          medicine_id: medicine.id,
          batch_id: batch.id,
          created_by: doctor.user.id,
          movement_type: "PURCHASE",
          quantity: purchaseQuantity,
          reason: purchaseReason,
          created_at: new Date(Date.now() - (90 + index) * 86400000),
        },
        transaction,
      );
      counts.stock_movements += 1;

      if (batchIndex === 2) {
        const expiryReason = `${DEMO_SEED_MARKER}: expired stock adjustment`;
        await findOrCreate(
          db.StockMovement,
          { batch_id: batch.id, movement_type: "EXPIRED", reason: expiryReason },
          {
            clinic_id: clinic.id,
            medicine_id: medicine.id,
            batch_id: batch.id,
            created_by: doctor.user.id,
            movement_type: "EXPIRED",
            quantity: -8,
            reason: expiryReason,
            created_at: new Date(Date.now() - 3 * 86400000),
          },
          transaction,
        );
        counts.stock_movements += 1;
        await batch.update({ quantity: purchaseQuantity - 8 }, { transaction });
      } else if (batchIndex === 0 && medicineIndex < movementTypes.length) {
        const movementType = movementTypes[medicineIndex];
        const delta = movementType === "ADJUST" ? 2 : movementType === "PURCHASE" ? 4 : -2;
        const adjustmentReason = `${DEMO_SEED_MARKER}: ${movementType.toLowerCase()} scenario`;
        await findOrCreate(
          db.StockMovement,
          { batch_id: batch.id, movement_type: movementType, reason: adjustmentReason },
          {
            clinic_id: clinic.id,
            medicine_id: medicine.id,
            batch_id: batch.id,
            created_by: doctor.user.id,
            movement_type: movementType,
            quantity: delta,
            reason: adjustmentReason,
          },
          transaction,
        );
        counts.stock_movements += 1;
        await batch.update({ quantity: purchaseQuantity + delta }, { transaction });
      } else {
        await batch.update({ quantity: purchaseQuantity }, { transaction });
      }
    }

    for (const [clinicIndex, { clinic, doctor }] of clinics.entries()) {
      for (let expenseIndex = 0; expenseIndex < 8; expenseIndex += 1) {
        const description = `${DEMO_SEED_MARKER}: ${[
          "Monthly rent and facility costs",
          "Staff payroll",
          "Medical supplies replenishment",
          "Equipment maintenance",
          "Electricity and water utilities",
          "Sanitization service",
          "Community health outreach",
          "Office supplies",
        ][expenseIndex]}`;
        await findOrCreate(
          db.Expense,
          { clinic_id: clinic.id, description },
          {
            clinic_id: clinic.id,
            created_by: doctor.user.id,
            expense_date: dateOnly(-expenseIndex * 9 - clinicIndex),
            amount: (1200 + expenseIndex * 375 + clinicIndex * 110).toFixed(2),
            category_id: expenseCategories[expenseIndex],
            description,
            payment_method: paymentMethods[expenseIndex % paymentMethods.length],
            vendor: `Demo Vendor ${expenseIndex + 1}`,
            receipt_url: null,
          },
          transaction,
        );
        counts.expenses += 1;
      }
    }

    for (const [index, { user }] of seededDoctors.entries()) {
      await findOrCreate(
        db.AuditLog,
        {
          action: "DEMO_DATA_SEEDED",
          entity: "DoctorProfile",
          entity_id: `demo-profile-${index + 1}`,
          user_id: user.id,
        },
        {
          action: "DEMO_DATA_SEEDED",
          entity: "DoctorProfile",
          entity_id: `demo-profile-${index + 1}`,
          user_id: user.id,
          ip: "127.0.0.1",
          user_agent: "Development demo seeder",
          details: { marker: DEMO_SEED_MARKER, note: "Synthetic records only." },
        },
        transaction,
      );
    }

    await transaction.commit();
    console.log("Development demo data seeded successfully.");
    console.log(`Database: ${db.sequelize.config.database} on ${db.sequelize.config.host}`);
    console.log(`Records processed (created or updated): ${JSON.stringify(counts)}`);
    console.log(`Doctor/admin password: ${DEMO_PASSWORD}`);
    console.log("Doctor accounts: doctor.demo1@example.test, doctor.demo2@example.test, doctor.demo3@example.test");
    console.log("Admin account: admin.demo@example.test");
    console.log("Synthetic records use example.test emails and DEMO identifiers.");
  } catch (error) {
    await transaction.rollback();
    throw error;
  } finally {
    await db.sequelize.close();
  }
}

seedDemoData().catch((error) => {
  console.error("Development demo seeding failed:", error.message);
  process.exitCode = 1;
});
