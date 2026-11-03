"use strict";

module.exports = (sequelize, DataTypes) => {
  const PatientVisit = sequelize.define(
    "PatientVisit",
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
      clinic_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      doctor_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      visit_number: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      visit_date: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      visit_type: {
        type: DataTypes.ENUM("new", "follow_up", "emergency"),
        allowNull: false,
      },
      chief_complaint: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      symptoms: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      medical_history: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      examination_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      temperature: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      blood_pressure_systolic: {
        type: DataTypes.SMALLINT,
        allowNull: true,
      },
      blood_pressure_diastolic: {
        type: DataTypes.SMALLINT,
        allowNull: true,
      },
      pulse_rate: {
        type: DataTypes.SMALLINT,
        allowNull: true,
      },
      respiratory_rate: {
        type: DataTypes.SMALLINT,
        allowNull: true,
      },
      oxygen_saturation: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
      },
      weight: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      height: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
      },
      diagnosis_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      treatment_plan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      follow_up_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      doctor_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "completed",
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
      tableName: "patient_visits",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          name: "patient_visits_patient_date_idx",
          fields: ["patient_id", "visit_date"],
        },
        {
          name: "patient_visits_clinic_number_unique",
          unique: true,
          fields: ["clinic_id", "visit_number"],
        },
      ],
    }
  );

  PatientVisit.associate = (models) => {
    PatientVisit.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
    PatientVisit.belongsTo(models.Clinic, {
      foreignKey: "clinic_id",
      as: "clinic",
    });
    PatientVisit.belongsTo(models.User, {
      foreignKey: "doctor_id",
      as: "doctor",
    });
    PatientVisit.hasMany(models.VisitDiagnosis, {
      foreignKey: "visit_id",
      as: "diagnoses",
    });
    PatientVisit.hasMany(models.Prescription, {
      foreignKey: "visit_id",
      as: "prescriptions",
    });
    PatientVisit.hasMany(models.LabOrder, {
      foreignKey: "visit_id",
      as: "labOrders",
    });
  };

  return PatientVisit;
};
