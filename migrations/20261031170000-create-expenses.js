"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        "expenses",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          clinic_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "clinics", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          created_by: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          expense_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          amount: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
          },
          category_id: {
            type: Sequelize.STRING(40),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          payment_method: {
            type: Sequelize.ENUM(
              "UPI",
              "CARD",
              "BANK_TRANSFER",
              "CASH",
              "OTHER",
            ),
            allowNull: false,
          },
          vendor: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          receipt_url: {
            type: Sequelize.STRING(2048),
            allowNull: true,
          },
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

      await queryInterface.addIndex("expenses", ["clinic_id", "expense_date"], {
        name: "expenses_clinic_date_idx",
        transaction,
      });
      await queryInterface.addIndex("expenses", ["clinic_id", "category_id"], {
        name: "expenses_clinic_category_idx",
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("expenses");
  },
};
