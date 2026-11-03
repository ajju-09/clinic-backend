"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("users");

    if (tableInfo.otp) {
      await queryInterface.removeColumn("users", "otp");
    }
    if (tableInfo.attempt) {
      await queryInterface.removeColumn("users", "attempt");
    }
    if (tableInfo.expires_at) {
      await queryInterface.removeColumn("users", "expires_at");
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("users");

    if (!tableInfo.otp) {
      await queryInterface.addColumn("users", "otp", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }
    if (!tableInfo.attempt) {
      await queryInterface.addColumn("users", "attempt", {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!tableInfo.expires_at) {
      await queryInterface.addColumn("users", "expires_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
  },
};
