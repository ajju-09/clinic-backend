"use strict";

module.exports = (sequelize, DataTypes) => {
  const PatientDocument = sequelize.define(
    "PatientDocument",
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
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      mime_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      file_size: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
      },
      cloudinary_public_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      cloudinary_url: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },
      cloudinary_resource_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      file_format: {
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
      tableName: "patient_documents",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [{ fields: ["patient_id"] }],
    },
  );

  PatientDocument.associate = (models) => {
    PatientDocument.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
  };

  return PatientDocument;
};
