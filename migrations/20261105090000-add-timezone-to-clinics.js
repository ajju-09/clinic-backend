"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("clinics", "timezone", {
      type: Sequelize.STRING(64),
      allowNull: false,
      defaultValue: process.env.APP_DEFAULT_TIMEZONE || "Asia/Kolkata",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("clinics", "timezone");
  },
};
