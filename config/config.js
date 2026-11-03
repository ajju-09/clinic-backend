"use strict";

require("dotenv").config();

const commonConfig = {
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  dialect: "mysql",
  logging: false,
};

module.exports = {
  development: {
    ...commonConfig,
    database: process.env.DB_NAME || "clinic_management_data",
  },
  test: {
    ...commonConfig,
    database: process.env.DB_TEST_NAME || "clinic_management_test",
  },
  production: {
    ...commonConfig,
    database: process.env.DB_PRODUCTION_NAME || "clinic_management",
  },
};
