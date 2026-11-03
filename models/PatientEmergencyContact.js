"use strict";

module.exports = (sequelize, DataTypes) => {
  const PatientEmergencyContact = sequelize.define(
    "PatientEmergencyContact",
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
      contact_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      relationship: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      alternate_phone: {
        type: DataTypes.STRING(20),
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
      tableName: "patient_emergency_contacts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  PatientEmergencyContact.associate = (models) => {
    PatientEmergencyContact.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
  };

  return PatientEmergencyContact;
};
