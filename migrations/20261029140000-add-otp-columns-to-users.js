"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("users");

    if (!tableDescription.otp) {
      await queryInterface.addColumn("users", "otp", {
        type: Sequelize.STRING(10),
        allowNull: true,
        after: "is_verified",
      });
    }

    if (!tableDescription.otp_attempt) {
      await queryInterface.addColumn("users", "otp_attempt", {
        type: Sequelize.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        after: "otp",
      });
    }

    if (!tableDescription.otp_expires_at) {
      await queryInterface.addColumn("users", "otp_expires_at", {
        type: Sequelize.DATE,
        allowNull: true,
        after: "otp_attempt",
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("users");

    if (tableDescription.otp_expires_at) {
      await queryInterface.removeColumn("users", "otp_expires_at");
    }
    if (tableDescription.otp_attempt) {
      await queryInterface.removeColumn("users", "otp_attempt");
    }
    if (tableDescription.otp) {
      await queryInterface.removeColumn("users", "otp");
    }
  },
};

