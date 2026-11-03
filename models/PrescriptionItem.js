"use strict";

module.exports = (sequelize, DataTypes) => {
  const PrescriptionItem = sequelize.define(
    "PrescriptionItem",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      prescription_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      medicine_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      dosage: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      frequency: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      duration: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      quantity: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      route: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      timing: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "prescription_items",
      timestamps: false,
    }
  );

  PrescriptionItem.associate = (models) => {
    PrescriptionItem.belongsTo(models.Prescription, {
      foreignKey: "prescription_id",
      as: "prescription",
    });
  };

  return PrescriptionItem;
};
