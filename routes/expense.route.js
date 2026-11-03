"use strict";

const express = require("express");
const route = express.Router();
const expenseController = require("../controllers/expense.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const expenseValidation = require("../helper/expenseValidation");

route.use(authenticate);

route.get(
  "/",
  validationMiddleware(expenseValidation.listExpensesQuerySchema, "query"),
  expenseController.getExpenses,
);
route.get(
  "/reports",
  validationMiddleware(expenseValidation.expenseReportQuerySchema, "query"),
  expenseController.getExpenseReports,
);
route.post(
  "/",
  validationMiddleware(expenseValidation.createExpenseSchema),
  expenseController.createExpense,
);
route.get(
  "/:id",
  validationMiddleware(expenseValidation.expenseIdParamsSchema, "params"),
  expenseController.getSingleExpense,
);
route.put(
  "/:id",
  validationMiddleware(expenseValidation.expenseIdParamsSchema, "params"),
  validationMiddleware(expenseValidation.updateExpenseSchema),
  expenseController.updateExpense,
);
route.delete(
  "/:id",
  validationMiddleware(expenseValidation.expenseIdParamsSchema, "params"),
  expenseController.deleteExpense,
);

module.exports = route;