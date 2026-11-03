"use strict";

const { Op } = require("sequelize");
const db = require("../models");
const AppError = require("../utils/AppError");

const createdByInclude = {
  model: db.User,
  as: "createdByUser",
  attributes: ["first_name", "last_name", "username"],
};

const toExpenseResponse = (expense) => {
  const record = expense.get ? expense.get({ plain: true }) : expense;
  const user = record.createdByUser;
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    id: record.id,
    clinicId: record.clinic_id,
    date: record.expense_date,
    amount: Number(record.amount),
    categoryId: record.category_id,
    description: record.description,
    paymentMethod: record.payment_method,
    vendor: record.vendor,
    receiptUrl: record.receipt_url,
    createdBy: fullName || user?.username || "Doctor",
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
};

const toDatabaseFields = (data) => {
  const fields = {};
  if (Object.hasOwn(data, "date")) fields.expense_date = data.date;
  if (Object.hasOwn(data, "amount")) fields.amount = data.amount;
  if (Object.hasOwn(data, "categoryId")) fields.category_id = data.categoryId;
  if (Object.hasOwn(data, "description")) fields.description = data.description || null;
  if (Object.hasOwn(data, "paymentMethod")) fields.payment_method = data.paymentMethod;
  if (Object.hasOwn(data, "vendor")) fields.vendor = data.vendor || null;
  return fields;
};

const requireOwnedClinic = async (userId, clinicId) => {
  const clinic = await db.Clinic.findOne({
    attributes: ["id"],
    where: { id: clinicId, user_id: userId },
  });
  if (!clinic) throw AppError.notFound("Clinic not found");
  return clinic;
};

const getExpenseProfileService = async (userId, clinicId) => {
  await requireOwnedClinic(userId, clinicId);
  const expenses = await db.Expense.findAll({
    where: { clinic_id: clinicId },
    include: [createdByInclude],
    order: [
      ["expense_date", "DESC"],
      ["created_at", "DESC"],
    ],
  });
  return { success: true, data: expenses.map(toExpenseResponse) };
};

const createExpenseService = async (userId, expenseData) => {
  await requireOwnedClinic(userId, expenseData.clinicId);
  const expense = await db.Expense.create({
    clinic_id: expenseData.clinicId,
    created_by: userId,
    ...toDatabaseFields(expenseData),
  });
  const savedExpense = await db.Expense.findByPk(expense.id, {
    include: [createdByInclude],
  });

  return {
    success: true,
    message: "Expense recorded successfully",
    data: toExpenseResponse(savedExpense),
  };
};

const getSingleExpenseService = async (userId, expenseId) => {
  const expense = await db.Expense.findOne({
    include: [
      createdByInclude,
      {
        model: db.Clinic,
        as: "clinic",
        attributes: [],
        where: { user_id: userId },
        required: true,
      },
    ],
    where: { id: expenseId },
  });
  if (!expense) throw AppError.notFound("Expense not found");
  return { success: true, data: toExpenseResponse(expense) };
};

const updateExpenseService = async (userId, expenseId, expenseData) => {
  const expense = await db.Expense.findOne({
    include: [{
      model: db.Clinic,
      as: "clinic",
      attributes: [],
      where: { user_id: userId },
      required: true,
    }],
    where: { id: expenseId },
  });
  if (!expense) throw AppError.notFound("Expense not found");

  await expense.update(toDatabaseFields(expenseData));
  const savedExpense = await db.Expense.findByPk(expense.id, {
    include: [createdByInclude],
  });
  return {
    success: true,
    message: "Expense updated successfully",
    data: toExpenseResponse(savedExpense),
  };
};

const deleteExpenseService = async (userId, expenseId) => {
  const expense = await db.Expense.findOne({
    include: [{
      model: db.Clinic,
      as: "clinic",
      attributes: [],
      where: { user_id: userId },
      required: true,
    }],
    where: { id: expenseId },
  });
  if (!expense) throw AppError.notFound("Expense not found");
  await expense.destroy();
  return { success: true, message: "Expense deleted successfully" };
};

const getExpenseReportsService = async (userId, { clinicId, from, to }) => {
  await requireOwnedClinic(userId, clinicId);
  const expenseDate = {};
  if (from) expenseDate[Op.gte] = from;
  if (to) expenseDate[Op.lte] = to;
  const hasExpenseDateFilter = Boolean(from || to);

  const expenses = await db.Expense.findAll({
    attributes: ["amount", "category_id", "payment_method"],
    where: {
      clinic_id: clinicId,
      ...(hasExpenseDateFilter ? { expense_date: expenseDate } : {}),
    },
    raw: true,
  });

  const categories = new Map();
  const payments = new Map();
  let totalCents = 0;
  for (const expense of expenses) {
    const amountCents = Math.round(Number(expense.amount) * 100);
    totalCents += amountCents;
    const category = categories.get(expense.category_id) || { total: 0, count: 0 };
    category.total += amountCents;
    category.count += 1;
    categories.set(expense.category_id, category);

    payments.set(
      expense.payment_method,
      (payments.get(expense.payment_method) || 0) + amountCents,
    );
  }

  const total = totalCents / 100;
  return {
    success: true,
    data: {
      totalSpent: total,
      transactionCount: expenses.length,
      averageAmount: expenses.length ? total / expenses.length : 0,
      categories: [...categories].map(([categoryId, summary]) => ({
        categoryId,
        total: summary.total / 100,
        count: summary.count,
      })),
      payments: [...payments].map(([method, amount]) => ({
        method,
        total: amount / 100,
      })),
    },
  };
};

module.exports = {
  getExpenseProfileService,
  createExpenseService,
  getSingleExpenseService,
  updateExpenseService,
  deleteExpenseService,
  getExpenseReportsService,
};