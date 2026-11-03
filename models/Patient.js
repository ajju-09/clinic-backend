"use strict";

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define(
    "Patient",
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
      uhid: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      blood_group: {
        type: DataTypes.STRING(5),
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
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      pin_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      marital_status: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      occupation: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      registration_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      profile_photo_public_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      profile_photo_format: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      current_medications: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      previous_procedures: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      smoking_habit: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      alcohol_consumption: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      exercise_frequency: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "patients",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      indexes: [
        {
          name: "patients_uhid_unique",
          unique: true,
          fields: ["uhid"],
        },
      ],
    }
  );

  Patient.associate = (models) => {
    Patient.belongsTo(models.Clinic, {
      foreignKey: "clinic_id",
      as: "clinic",
    });
    Patient.hasMany(models.PatientEmergencyContact, {
      foreignKey: "patient_id",
      as: "emergencyContacts",
    });
    Patient.hasMany(models.PatientAllergy, {
      foreignKey: "patient_id",
      as: "allergies",
    });
    Patient.hasMany(models.PatientCondition, {
      foreignKey: "patient_id",
      as: "conditions",
    });
    Patient.hasMany(models.PatientDocument, {
      foreignKey: "patient_id",
      as: "documents",
      onDelete: "CASCADE",
    });
    Patient.hasMany(models.PatientVisit, {
      foreignKey: "patient_id",
      as: "visits",
    });
    Patient.hasMany(models.Prescription, {
      foreignKey: "patient_id",
      as: "prescriptions",
    });
    Patient.hasMany(models.LabOrder, {
      foreignKey: "patient_id",
      as: "labOrders",
    });
  };

  return Patient;
};
