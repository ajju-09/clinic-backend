"use strict";

module.exports = (sequelize, DataTypes) => {
  const Prescription = sequelize.define(
    "Prescription",
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
      doctor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      prescription_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
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
      tableName: "prescriptions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Prescription.associate = (models) => {
    Prescription.belongsTo(models.PatientVisit, {
      foreignKey: "visit_id",
      as: "visit",
    });
    Prescription.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
    Prescription.belongsTo(models.User, {
      foreignKey: "doctor_id",
      as: "doctor",
    });
    Prescription.hasMany(models.PrescriptionItem, {
      foreignKey: "prescription_id",
      as: "items",
    });
  };

  return Prescription;
};
