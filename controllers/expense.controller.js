const asyncHandler = require("../utils/asyncHandler");
const expenseServices = require("../services/expense.services");

const getExpenses = asyncHandler(async (req, res) => {
  const result = await expenseServices.getExpenseProfileService(
    req.user.id,
    req.query.clinicId,
  );
  res.status(200).json(result);
});

const createExpense = asyncHandler(async (req, res) => {
  const result = await expenseServices.createExpenseService(req.user.id, req.body);
  res.status(201).json(result);
});

const getSingleExpense = asyncHandler(async (req, res) => {
  const result = await expenseServices.getSingleExpenseService(
    req.user.id,
    req.params.id,
  );
  res.status(200).json(result);
});

const updateExpense = asyncHandler(async (req, res) => {
  const result = await expenseServices.updateExpenseService(
    req.user.id,
    req.params.id,
    req.body,
  );
  res.status(200).json(result);
});

const deleteExpense = asyncHandler(async (req, res) => {
  const result = await expenseServices.deleteExpenseService(
    req.user.id,
    req.params.id,
  );
  res.status(200).json(result);
});

const getExpenseReports = asyncHandler(async (req, res) => {
  const result = await expenseServices.getExpenseReportsService(
    req.user.id,
    req.query,
  );
  res.status(200).json(result);
});

module.exports = {
  getExpenses,
  createExpense,
  getSingleExpense,
  updateExpense,
  deleteExpense,
  getExpenseReports,
};