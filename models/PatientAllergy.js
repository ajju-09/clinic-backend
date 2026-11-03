"use strict";

module.exports = (sequelize, DataTypes) => {
  const PatientAllergy = sequelize.define(
    "PatientAllergy",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      allergy_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      reaction: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      severity: {
        type: DataTypes.ENUM("mild", "moderate", "severe"),
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
      tableName: "patient_allergies",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  PatientAllergy.associate = (models) => {
    PatientAllergy.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
  };

  return PatientAllergy;
};
