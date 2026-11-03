"use strict";

module.exports = (sequelize, DataTypes) => {
  const DoctorProfile = sequelize.define(
    "DoctorProfile",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
      },
      md_code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: "Unique doctor code, e.g. MD-847291",
      },
      medical_registration_no: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      profile_image_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
      profile_image_public_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      gender: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      experience_years: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: true,
      },
      specialization: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      qualification: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      profile_completion_status: {
        type: DataTypes.ENUM("incomplete", "in_progress", "completed"),
        allowNull: false,
        defaultValue: "incomplete",
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
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
      tableName: "doctor_profiles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
    },
  );

  DoctorProfile.associate = (models) => {
    DoctorProfile.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return DoctorProfile;
};
