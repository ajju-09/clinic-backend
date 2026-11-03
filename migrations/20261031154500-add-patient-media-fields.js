"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        "patients",
        "profile_photo_public_id",
        { type: Sequelize.STRING(255), allowNull: true },
        { transaction },
      );
      await queryInterface.addColumn(
        "patients",
        "profile_photo_format",
        { type: Sequelize.STRING(20), allowNull: true },
        { transaction },
      );
      await queryInterface.createTable(
        "patient_documents",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "patients", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          file_name: { type: Sequelize.STRING(255), allowNull: false },
          mime_type: { type: Sequelize.STRING(100), allowNull: false },
          file_size: { type: Sequelize.BIGINT.UNSIGNED, allowNull: false },
          cloudinary_public_id: { type: Sequelize.STRING(255), allowNull: false },
          cloudinary_resource_type: { type: Sequelize.STRING(20), allowNull: false },
          file_format: { type: Sequelize.STRING(20), allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updated_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );
      await queryInterface.addIndex("patient_documents", ["patient_id"], {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable("patient_documents", { transaction });
      await queryInterface.removeColumn("patients", "profile_photo_format", {
        transaction,
      });
      await queryInterface.removeColumn("patients", "profile_photo_public_id", {
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
