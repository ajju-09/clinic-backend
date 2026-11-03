"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable("doctor_profiles");
    if (!tableInfo.profile_image) {
      await queryInterface.addColumn("doctor_profiles", "profile_image", {
        type: Sequelize.STRING(2048),
        allowNull: true,
        after: "md_code",
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable("doctor_profiles");
    if (tableInfo.profile_image) {
      await queryInterface.removeColumn("doctor_profiles", "profile_image");
    }
  },
};
