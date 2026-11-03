"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    let columns = await queryInterface.describeTable("doctor_profiles");

    if (!columns.specialization) {
      await queryInterface.addColumn("doctor_profiles", "specialization", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      columns = await queryInterface.describeTable("doctor_profiles");
    } else if (!/JSON/i.test(columns.specialization.type)) {
      const temporaryColumn = "specialization_json_migration";
      if (!columns[temporaryColumn]) {
        await queryInterface.addColumn("doctor_profiles", temporaryColumn, {
          type: Sequelize.JSON,
          allowNull: true,
        });
      }

      await queryInterface.sequelize.query(
        `UPDATE doctor_profiles
         SET ${temporaryColumn} = CASE
           WHEN specialization IS NULL OR TRIM(specialization) = '' THEN JSON_ARRAY()
           ELSE JSON_ARRAY(TRIM(specialization))
         END`,
      );
      await queryInterface.removeColumn("doctor_profiles", "specialization");
      await queryInterface.renameColumn(
        "doctor_profiles",
        temporaryColumn,
        "specialization",
      );
      columns = await queryInterface.describeTable("doctor_profiles");
    }

    if (!columns.qualification) {
      await queryInterface.addColumn("doctor_profiles", "qualification", {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
      columns = await queryInterface.describeTable("doctor_profiles");
    }

    if (columns.deleted_at && columns.created_at && columns.updated_at) {
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN qualification VARCHAR(150) NULL AFTER deleted_at",
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN specialization JSON NULL AFTER qualification",
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER specialization",
      );
      await queryInterface.sequelize.query(
        "ALTER TABLE doctor_profiles MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER created_at",
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("doctor_profiles");
    if (!columns.specialization || !/JSON/i.test(columns.specialization.type)) {
      return;
    }

    const temporaryColumn = "specialization_legacy_migration";
    await queryInterface.addColumn("doctor_profiles", temporaryColumn, {
      type: Sequelize.STRING(100),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `UPDATE doctor_profiles
       SET ${temporaryColumn} = CASE
         WHEN JSON_TYPE(specialization) = 'ARRAY'
           THEN JSON_UNQUOTE(JSON_EXTRACT(specialization, '$[0]'))
         ELSE JSON_UNQUOTE(specialization)
       END`,
    );
    await queryInterface.removeColumn("doctor_profiles", "specialization");
    await queryInterface.renameColumn(
      "doctor_profiles",
      temporaryColumn,
      "specialization",
    );
  },
};
