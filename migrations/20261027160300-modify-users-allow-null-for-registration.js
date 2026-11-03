"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        "users",
        "first_name",
        {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "users",
        "username",
        {
          type: Sequelize.STRING(30),
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "users",
        "password",
        {
          type: Sequelize.STRING(255),
          allowNull: true,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.changeColumn(
        "users",
        "first_name",
        {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "users",
        "username",
        {
          type: Sequelize.STRING(30),
          allowNull: false,
        },
        { transaction }
      );

      await queryInterface.changeColumn(
        "users",
        "password",
        {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        { transaction }
      );

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
