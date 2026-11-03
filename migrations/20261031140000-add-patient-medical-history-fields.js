"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn("patients", "current_medications", {
        type: Sequelize.JSON,
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("patients", "previous_procedures", {
        type: Sequelize.JSON,
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("patients", "smoking_habit", {
        type: Sequelize.STRING(30),
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("patients", "alcohol_consumption", {
        type: Sequelize.STRING(30),
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn("patients", "exercise_frequency", {
        type: Sequelize.STRING(50),
        allowNull: true,
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const column of [
        "exercise_frequency",
        "alcohol_consumption",
        "smoking_habit",
        "previous_procedures",
        "current_medications",
      ]) {
        await queryInterface.removeColumn("patients", column, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
