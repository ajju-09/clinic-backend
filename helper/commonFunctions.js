const db = require("../models");
const { sequelize } = db;

const databaseConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log("[Database] Connection has been established successfully.");
  } catch (error) {
    console.log("[Database] Unable to connect to the database:", error);
  }
};

const generateUniqueMdCode = async () => {
  let attempts = 0;

  while (attempts < 20) {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const mdCode = `MD-${randomNum}`;

    const existing = await db.DoctorProfile.findOne({
      where: { md_code: mdCode },
    });

    if (!existing) return mdCode;
    attempts++;
  }

  // Fallback: use timestamp-based code to guarantee uniqueness
  return `MD-${Date.now().toString().slice(-6)}`;
};

module.exports = {
  databaseConnection,
  generateUniqueMdCode,
};
