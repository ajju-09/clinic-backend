"use strict";

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING(30),
        allowNull: true,
        unique: true,
      },
      first_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      last_name: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      role: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: "pending",
      },
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      password_change_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      // OTP fields – stored in DB (used for registration & forgot-password flows)
      otp: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      otp_attempt: {
        type: DataTypes.TINYINT.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      otp_expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      otp_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_login: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      is_verified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      tableName: "users",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      defaultScope: {
        attributes: { exclude: ["password", "otp"] },
      },
      scopes: {
        withPassword: { attributes: { include: ["password"] } },
        withOtp: { attributes: { include: ["password", "otp"] } },
      },
    },
  );

  User.associate = (models) => {
    User.hasMany(models.Clinic, {
      foreignKey: "user_id",
      as: "clinics",
    });
    User.hasOne(models.DoctorProfile, {
      foreignKey: "user_id",
      as: "doctorProfile",
    });
    User.hasMany(models.AuditLog, {
      foreignKey: "user_id",
      as: "auditLogs",
    });
    User.hasMany(models.PatientVisit, {
      foreignKey: "doctor_id",
      as: "patientVisits",
    });
    User.hasMany(models.Prescription, {
      foreignKey: "doctor_id",
      as: "prescriptions",
    });
  };

  return User;
};
