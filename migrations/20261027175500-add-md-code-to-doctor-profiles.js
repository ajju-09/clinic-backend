"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("doctor_profiles");
    if (!tableInfo.md_code) {
      await queryInterface.addColumn("doctor_profiles", "md_code", {
        type: Sequelize.STRING(20),
        allowNull: true,
        unique: true,
        after: "user_id",
        comment: "Unique doctor code, e.g. MD-847291",
      });
      await queryInterface.addIndex("doctor_profiles", ["md_code"], {
        name: "doctor_profiles_md_code_unique",
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("doctor_profiles");
    if (tableInfo.md_code) {
      await queryInterface.removeColumn("doctor_profiles", "md_code");
    }
  },
};
