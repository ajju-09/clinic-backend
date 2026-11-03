"use strict";

module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define(
    "StockMovement",
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
      medicine_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      batch_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      movement_type: {
        type: DataTypes.ENUM(
          "PURCHASE",
          "CONSUME",
          "DISPENSE",
          "WASTAGE",
          "EXPIRED",
          "ADJUST",
        ),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "stock_movements",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        { fields: ["clinic_id", "created_at"] },
        { fields: ["medicine_id", "created_at"] },
      ],
    },
  );

  StockMovement.associate = (models) => {
    StockMovement.belongsTo(models.Clinic, {
      foreignKey: "clinic_id",
      as: "clinic",
    });
    StockMovement.belongsTo(models.Medicine, {
      foreignKey: "medicine_id",
      as: "medicine",
    });
    StockMovement.belongsTo(models.MedicineBatch, {
      foreignKey: "batch_id",
      as: "batch",
    });
    StockMovement.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdByUser",
    });
  };

  return StockMovement;
};
