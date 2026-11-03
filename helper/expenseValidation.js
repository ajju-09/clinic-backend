"use strict";

const Joi = require("joi");

const paymentMethods = ["UPI", "CARD", "BANK_TRANSFER", "CASH", "OTHER"];
const categories = [
  "cat-rent",
  "cat-salaries",
  "cat-medicines",
  "cat-equipment",
  "cat-utilities",
  "cat-maintenance",
  "cat-marketing",
  "cat-misc",
];

const expenseFields = {
  date: Joi.string().isoDate(),
  amount: Joi.number()
    .positive()
    .max(9999999999.99)
    .custom((value, helpers) => {
      if (Number(value.toFixed(2)) !== value) {
        return helpers.error("number.precision");
      }
      return value;
    })
    .messages({
      "number.precision": "Amount must have at most 2 decimal places",
    }),
  categoryId: Joi.string().valid(...categories),
  description: Joi.string().trim().max(5000).allow("", null),
  paymentMethod: Joi.string().valid(...paymentMethods),
  vendor: Joi.string().trim().max(255).allow("", null),
};

const expenseIdParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const listExpensesQuerySchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
});

const expenseReportQuerySchema = Joi.object({
  clinicId: Joi.number().integer().positive().required(),
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
}).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) {
    return helpers.error("date.range");
  }
  return value;
}).messages({
  "date.range": '"from" must be on or before "to"',
});

const createExpenseSchema = Joi.object({
  ...expenseFields,
  clinicId: Joi.number().integer().positive().required(),
}).fork(
  ["date", "amount", "categoryId", "paymentMethod"],
  (schema) => schema.required(),
);

const updateExpenseSchema = Joi.object(expenseFields)
  .min(1)
  .options({ abortEarly: false, stripUnknown: true });

module.exports = {
  expenseIdParamsSchema,
  listExpensesQuerySchema,
  expenseReportQuerySchema,
  createExpenseSchema: createExpenseSchema.options({
    abortEarly: false,
    stripUnknown: true,
  }),
  updateExpenseSchema,
};
