"use strict";

module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    "Expense",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      clinic_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      expense_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
      },
      category_id: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      payment_method: {
        type: DataTypes.ENUM("UPI", "CARD", "BANK_TRANSFER", "CASH", "OTHER"),
        allowNull: false,
      },
      vendor: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      receipt_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "expenses",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );

  Expense.associate = (models) => {
    Expense.belongsTo(models.Clinic, {
      foreignKey: "clinic_id",
      as: "clinic",
    });
    Expense.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdByUser",
    });
  };

  return Expense;
};
