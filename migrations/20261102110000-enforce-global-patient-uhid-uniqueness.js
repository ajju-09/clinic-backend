"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const duplicates = await queryInterface.sequelize.query(
        "SELECT uhid, COUNT(*) AS patient_count FROM patients GROUP BY uhid HAVING COUNT(*) > 1 LIMIT 10",
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction,
        },
      );
      if (duplicates.length) {
        const duplicateIds = duplicates
          .map(({ uhid }) => uhid)
          .join(", ");
        throw new Error(
          `Cannot enforce global patient UHID uniqueness; duplicate IDs exist: ${duplicateIds}. Resolve these IDs, then rerun the migration.`,
        );
      }

      let indexes = await queryInterface.showIndex("patients", { transaction });
      const hasIndex = (name) => indexes.some((index) => index.name === name);

      // MySQL requires an index starting with clinic_id for its foreign key.
      if (!hasIndex("patients_clinic_id_idx")) {
        await queryInterface.addIndex("patients", ["clinic_id"], {
          name: "patients_clinic_id_idx",
          transaction,
        });
        indexes = await queryInterface.showIndex("patients", { transaction });
      }

      if (!hasIndex("patients_uhid_unique")) {
        await queryInterface.addIndex("patients", ["uhid"], {
          name: "patients_uhid_unique",
          unique: true,
          transaction,
        });
        indexes = await queryInterface.showIndex("patients", { transaction });
      }

      if (hasIndex("patients_clinic_uhid_unique")) {
        await queryInterface.removeIndex(
          "patients",
          "patients_clinic_uhid_unique",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      let indexes = await queryInterface.showIndex("patients", { transaction });
      const hasIndex = (name) => indexes.some((index) => index.name === name);

      if (!hasIndex("patients_clinic_uhid_unique")) {
        await queryInterface.addIndex("patients", ["clinic_id", "uhid"], {
          name: "patients_clinic_uhid_unique",
          unique: true,
          transaction,
        });
        indexes = await queryInterface.showIndex("patients", { transaction });
      }

      if (hasIndex("patients_uhid_unique")) {
        await queryInterface.removeIndex("patients", "patients_uhid_unique", {
          transaction,
        });
        indexes = await queryInterface.showIndex("patients", { transaction });
      }

      if (hasIndex("patients_clinic_id_idx")) {
        await queryInterface.removeIndex("patients", "patients_clinic_id_idx", {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
