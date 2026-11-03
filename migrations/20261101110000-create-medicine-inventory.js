"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        "medicines",
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
          name: { type: Sequelize.STRING(255), allowNull: false },
          generic_name: { type: Sequelize.STRING(255), allowNull: true },
          dosage_form: { type: Sequelize.STRING(100), allowNull: false },
          strength: { type: Sequelize.STRING(100), allowNull: true },
          unit: { type: Sequelize.STRING(100), allowNull: false },
          reorder_level: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 10,
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
          deleted_at: { type: Sequelize.DATE, allowNull: true },
        },
        { transaction },
      );

      await queryInterface.createTable(
        "medicine_batches",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          medicine_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "medicines", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          batch_no: { type: Sequelize.STRING(100), allowNull: false },
          quantity: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
          },
          expiry_date: { type: Sequelize.DATEONLY, allowNull: false },
          purchase_date: { type: Sequelize.DATEONLY, allowNull: true },
          purchase_price: {
            type: Sequelize.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0,
          },
          supplier: { type: Sequelize.STRING(255), allowNull: true },
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

      await queryInterface.createTable(
        "stock_movements",
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
          medicine_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "medicines", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          batch_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: "medicine_batches", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          created_by: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          movement_type: {
            type: Sequelize.ENUM(
              "PURCHASE",
              "CONSUME",
              "DISPENSE",
              "WASTAGE",
              "EXPIRED",
              "ADJUST",
            ),
            allowNull: false,
          },
          quantity: { type: Sequelize.INTEGER, allowNull: false },
          reason: { type: Sequelize.TEXT, allowNull: true },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction },
      );

      await queryInterface.addIndex("medicines", ["clinic_id", "name"], {
        name: "medicines_clinic_name_idx",
        transaction,
      });
      await queryInterface.addIndex("medicine_batches", ["medicine_id"], {
        name: "medicine_batches_medicine_idx",
        transaction,
      });
      await queryInterface.addIndex("medicine_batches", ["expiry_date"], {
        name: "medicine_batches_expiry_idx",
        transaction,
      });
      await queryInterface.addIndex("stock_movements", ["clinic_id", "created_at"], {
        name: "stock_movements_clinic_created_idx",
        transaction,
      });
      await queryInterface.addIndex("stock_movements", ["medicine_id", "created_at"], {
        name: "stock_movements_medicine_created_idx",
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
      await queryInterface.dropTable("stock_movements", { transaction });
      await queryInterface.dropTable("medicine_batches", { transaction });
      await queryInterface.dropTable("medicines", { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
