"use strict";

module.exports = (sequelize, DataTypes) => {
  const LabOrder = sequelize.define(
    "LabOrder",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      visit_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      test_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      test_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "ordered",
      },
      ordered_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      result_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      report_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
    },
    {
      tableName: "lab_orders",
      timestamps: false,
    }
  );

  LabOrder.associate = (models) => {
    LabOrder.belongsTo(models.PatientVisit, {
      foreignKey: "visit_id",
      as: "visit",
    });
    LabOrder.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
  };

  return LabOrder;
};
