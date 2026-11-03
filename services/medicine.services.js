"use strict";

const db = require("../models");
const AppError = require("../utils/AppError");

const batchInclude = {
  model: db.MedicineBatch,
  as: "batches",
  required: false,
};
const movementIncludes = [
  { model: db.Medicine, as: "medicine", attributes: ["name"] },
  {
    model: db.User,
    as: "createdByUser",
    attributes: ["first_name", "last_name", "username"],
  },
];

const toBatchResponse = (batch) => ({
  id: batch.id,
  batchNo: batch.batch_no,
  quantity: Number(batch.quantity),
  expiryDate: batch.expiry_date,
  purchaseDate: batch.purchase_date,
  purchasePrice: Number(batch.purchase_price),
  supplier: batch.supplier,
});

const toMedicineResponse = (medicine) => {
  const record = medicine.get ? medicine.get({ plain: true }) : medicine;
  const batches = (record.batches || []).map(toBatchResponse);
  return {
    id: record.id,
    clinicId: record.clinic_id,
    name: record.name,
    genericName: record.generic_name,
    form: record.dosage_form,
    strength: record.strength,
    unit: record.unit,
    reorderLevel: Number(record.reorder_level),
    batches,
    batchCount: batches.length,
    totalStock: batches.reduce((total, batch) => total + batch.quantity, 0),
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

const toMovementResponse = (movement) => {
  const record = movement.get ? movement.get({ plain: true }) : movement;
  const user = record.createdByUser;
  return {
    id: record.id,
    clinicId: record.clinic_id,
    medicineId: record.medicine_id,
    medicineName: record.medicine?.name || "",
    batchId: record.batch_id,
    type: record.movement_type,
    quantity: Number(record.quantity),
    reason: record.reason,
    performedBy:
      [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
      user?.username ||
      "Doctor",
    createdAt: record.created_at,
  };
};

const toDatabaseFields = (data) => {
  const fields = {};
  if (Object.hasOwn(data, "name")) fields.name = data.name;
  if (Object.hasOwn(data, "genericName")) fields.generic_name = data.genericName || null;
  if (Object.hasOwn(data, "form")) fields.dosage_form = data.form;
  if (Object.hasOwn(data, "strength")) fields.strength = data.strength || null;
  if (Object.hasOwn(data, "unit")) fields.unit = data.unit;
  if (Object.hasOwn(data, "reorderLevel")) fields.reorder_level = data.reorderLevel;
  return fields;
};

const toBatchFields = (data) => ({
  batch_no: data.batchNo,
  quantity: data.quantity,
  expiry_date: data.expiryDate,
  purchase_date: data.purchaseDate || null,
  purchase_price: data.purchasePrice || 0,
  supplier: data.supplier || null,
});

const requireOwnedClinic = async (userId, clinicId, options = {}) => {
  const clinic = await db.Clinic.findOne({
    attributes: ["id"],
    where: { id: clinicId, user_id: userId },
    transaction: options.transaction,
  });
  if (!clinic) throw AppError.notFound("Clinic not found");
  return clinic;
};

const requireOwnedMedicine = async (userId, medicineId, options = {}) => {
  const medicine = await db.Medicine.findOne({
    include: [
      {
        model: db.Clinic,
        as: "clinic",
        attributes: [],
        where: { user_id: userId },
        required: true,
      },
    ],
    where: { id: medicineId },
    transaction: options.transaction,
    lock: options.lock,
  });
  if (!medicine) throw AppError.notFound("Medicine not found");
  return medicine;
};

const getMedicinesService = async (userId, clinicId) => {
  await requireOwnedClinic(userId, clinicId);
  const medicines = await db.Medicine.findAll({
    where: { clinic_id: clinicId },
    include: [batchInclude],
    order: [["name", "ASC"], [{ model: db.MedicineBatch, as: "batches" }, "expiry_date", "ASC"]],
  });
  return { success: true, data: medicines.map(toMedicineResponse) };
};

const createMedicineService = async (userId, data) => {
  const transaction = await db.sequelize.transaction();
  try {
    await requireOwnedClinic(userId, data.clinicId, { transaction });
    const medicine = await db.Medicine.create(
      {
        clinic_id: data.clinicId,
        created_by: userId,
        ...toDatabaseFields(data),
      },
      { transaction },
    );
    let initialMovement = null;
    if (data.initialBatch) {
      const batch = await db.MedicineBatch.create(
        { medicine_id: medicine.id, ...toBatchFields(data.initialBatch) },
        { transaction },
      );
      const movement = await db.StockMovement.create(
        {
          clinic_id: medicine.clinic_id,
          medicine_id: medicine.id,
          batch_id: batch.id,
          created_by: userId,
          movement_type: "PURCHASE",
          quantity: Number(batch.quantity),
          reason: `Added batch ${batch.batch_no}`,
        },
        { transaction },
      );
      initialMovement = await db.StockMovement.findByPk(movement.id, {
        include: movementIncludes,
        transaction,
      });
    }
    const savedMedicine = await db.Medicine.findByPk(medicine.id, {
      include: [batchInclude],
      transaction,
    });
    await transaction.commit();
    return {
      success: true,
      message: "Medicine added to inventory",
      data: {
        ...toMedicineResponse(savedMedicine),
        initialMovement: initialMovement
          ? toMovementResponse(initialMovement)
          : null,
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMedicineService = async (userId, medicineId) => {
  const medicine = await requireOwnedMedicine(userId, medicineId);
  await medicine.reload({ include: [batchInclude] });
  return { success: true, data: toMedicineResponse(medicine) };
};

const updateMedicineService = async (userId, medicineId, data) => {
  const medicine = await requireOwnedMedicine(userId, medicineId);
  await medicine.update(toDatabaseFields(data));
  await medicine.reload({ include: [batchInclude] });
  return {
    success: true,
    message: "Medicine specifications updated",
    data: toMedicineResponse(medicine),
  };
};

const deleteMedicineService = async (userId, medicineId) => {
  const medicine = await requireOwnedMedicine(userId, medicineId);
  await medicine.destroy();
  return { success: true, message: "Medicine removed from inventory" };
};

const addMedicineBatchService = async (userId, medicineId, data) => {
  const transaction = await db.sequelize.transaction();
  try {
    const medicine = await requireOwnedMedicine(userId, medicineId, { transaction });
    const batch = await db.MedicineBatch.create(
      { medicine_id: medicine.id, ...toBatchFields(data) },
      { transaction },
    );
    const savedMovement = await db.StockMovement.create(
      {
        clinic_id: medicine.clinic_id,
        medicine_id: medicine.id,
        batch_id: batch.id,
        created_by: userId,
        movement_type: "PURCHASE",
        quantity: Number(batch.quantity),
        reason: `Added batch ${batch.batch_no}`,
      },
      { transaction },
    );
    const movement = await db.StockMovement.findByPk(savedMovement.id, {
      include: movementIncludes,
      transaction,
    });
    await transaction.commit();
    return {
      success: true,
      message: "Medicine batch added",
      data: {
        batch: toBatchResponse(batch),
        movement: toMovementResponse(movement),
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const adjustMedicineStockService = async (userId, medicineId, data) => {
  const transaction = await db.sequelize.transaction();
  try {
    const medicine = await requireOwnedMedicine(userId, medicineId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const batch = await db.MedicineBatch.findOne({
      where: { id: data.batchId, medicine_id: medicine.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!batch) throw AppError.notFound("Medicine batch not found");

    const requestedQuantity = Number(data.quantity);
    const quantityChange =
      data.type === "ADJUST"
        ? requestedQuantity
        : data.type === "PURCHASE"
          ? requestedQuantity
          : -requestedQuantity;
    const updatedQuantity = Number(batch.quantity) + quantityChange;
    if (updatedQuantity < 0) {
      throw AppError.badRequest("The adjustment exceeds the batch quantity in stock");
    }

    await batch.update({ quantity: updatedQuantity }, { transaction });
    const savedMovement = await db.StockMovement.create(
      {
        clinic_id: medicine.clinic_id,
        medicine_id: medicine.id,
        batch_id: batch.id,
        created_by: userId,
        movement_type: data.type,
        quantity: quantityChange,
        reason: data.reason || null,
      },
      { transaction },
    );
    const movement = await db.StockMovement.findByPk(savedMovement.id, {
      include: movementIncludes,
      transaction,
    });
    await transaction.commit();
    return {
      success: true,
      message: "Stock movement recorded",
      data: {
        batch: toBatchResponse(batch),
        movement: toMovementResponse(movement),
      },
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const getMedicineAlertsService = async (userId, clinicId) => {
  await requireOwnedClinic(userId, clinicId);
  const medicines = await db.Medicine.findAll({
    where: { clinic_id: clinicId },
    include: [batchInclude],
    order: [["name", "ASC"]],
  });
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayString = today.toISOString().slice(0, 10);
  const lowStockAlerts = [];
  const expiringAlerts = [];
  const expiredAlerts = [];

  for (const medicineRecord of medicines) {
    const medicine = toMedicineResponse(medicineRecord);
    let usableStock = 0;
    let expiredStock = 0;
    let hasExpired = false;
    for (const batch of medicine.batches) {
      if (batch.expiryDate < todayString) {
        expiredStock += batch.quantity;
        hasExpired = true;
        expiredAlerts.push({ medicine, batch });
      } else {
        usableStock += batch.quantity;
        const daysLeft = Math.floor(
          (new Date(`${batch.expiryDate}T00:00:00Z`).getTime() - today.getTime()) /
            86400000,
        );
        if (daysLeft <= 60) expiringAlerts.push({ medicine, batch, daysLeft });
      }
    }
    const isLowStock = usableStock <= medicine.reorderLevel;
    if (isLowStock) {
      lowStockAlerts.push({
        medicine,
        metrics: {
          usableStock,
          expiredStock,
          totalStock: usableStock + expiredStock,
          isLowStock,
          isExpiringSoon: medicine.batches.some(
            (batch) =>
              batch.expiryDate >= todayString &&
              batch.expiryDate <=
                new Date(today.getTime() + 60 * 86400000).toISOString().slice(0, 10),
          ),
          hasExpired,
        },
      });
    }
  }

  return {
    success: true,
    data: { lowStockAlerts, expiringAlerts, expiredAlerts },
  };
};

const getMedicineHistoryService = async (userId, clinicId) => {
  await requireOwnedClinic(userId, clinicId);
  const movements = await db.StockMovement.findAll({
    where: { clinic_id: clinicId },
    include: movementIncludes,
    order: [["created_at", "DESC"]],
  });
  return { success: true, data: movements.map(toMovementResponse) };
};

module.exports = {
  getMedicinesService,
  createMedicineService,
  getMedicineService,
  updateMedicineService,
  deleteMedicineService,
  addMedicineBatchService,
  adjustMedicineStockService,
  getMedicineAlertsService,
  getMedicineHistoryService,
};
