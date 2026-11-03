"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let columns = await queryInterface.describeTable("doctor_profiles");

    if (!columns.profile_image_url) {
      await queryInterface.addColumn("doctor_profiles", "profile_image_url", {
        type: Sequelize.STRING(2048),
        allowNull: true,
      });
      columns = await queryInterface.describeTable("doctor_profiles");
    }

    if (!columns.profile_image_public_id) {
      await queryInterface.addColumn("doctor_profiles", "profile_image_public_id", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      columns = await queryInterface.describeTable("doctor_profiles");
    }

    if (columns.profile_image) {
      await queryInterface.sequelize.query(
        "UPDATE doctor_profiles SET profile_image_url = profile_image WHERE profile_image_url IS NULL AND profile_image REGEXP '^https?://'",
      );
    }

    const removedColumns = [
      "council",
      "clinic_name",
      "clinic_address",
      "profile_image",
      "display_name",
      "professional_title",
      "experience_start_date",
      "primary_phone",
      "alternate_phone",
      "professional_email",
      "consultation_fee",
      "languages",
    ];

    for (const column of removedColumns) {
      if (columns[column]) {
        await queryInterface.removeColumn("doctor_profiles", column);
        delete columns[column];
      }
    }

    if (columns.deleted_at && columns.created_at && columns.updated_at) {
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER deleted_at",
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at",
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("doctor_profiles");
    const restoredColumns = {
      council: { type: Sequelize.STRING(100), allowNull: true },
      clinic_name: { type: Sequelize.STRING(150), allowNull: true },
      clinic_address: { type: Sequelize.TEXT, allowNull: true },
      profile_image: { type: Sequelize.STRING(255), allowNull: true },
      display_name: { type: Sequelize.STRING(150), allowNull: true },
      professional_title: { type: Sequelize.STRING(50), allowNull: true },
      experience_start_date: { type: Sequelize.DATEONLY, allowNull: true },
      primary_phone: { type: Sequelize.STRING(20), allowNull: true },
      alternate_phone: { type: Sequelize.STRING(20), allowNull: true },
      professional_email: { type: Sequelize.STRING(255), allowNull: true },
      consultation_fee: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      languages: { type: Sequelize.JSON, allowNull: true },
    };

    for (const [column, definition] of Object.entries(restoredColumns)) {
      if (!columns[column]) {
        await queryInterface.addColumn("doctor_profiles", column, definition);
      }
    }
  },
};
