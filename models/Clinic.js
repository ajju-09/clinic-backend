
"use strict";

module.exports = (sequelize, DataTypes) => {
  const Clinic = sequelize.define(
    "Clinic",
    {
      // 1. Primary key and relationship
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },

      // 2. Basic clinic information
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      clinic_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      specialties: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      registration_no: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // 3. Contact information
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      alternate_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      website: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // 4. Address information
      address: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      address_line_2: {
        type: DataTypes.STRING(255),
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

      // 5. Operational information
      working_hours: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // 6. Cover image
      cover_image_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      cover_image_public_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      // 7. Timestamps
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
      tableName: "clinics",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // Associations
  Clinic.associate = (models) => {
    Clinic.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "owner",
    });
    Clinic.hasMany(models.Patient, {
      foreignKey: "clinic_id",
      as: "patients",
    });
    Clinic.hasMany(models.PatientVisit, {
      foreignKey: "clinic_id",
      as: "visits",
    });
  };

  return Clinic;
};
