"use strict";

module.exports = (sequelize, DataTypes) => {
  const PatientCondition = sequelize.define(
    "PatientCondition",
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
      condition_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      diagnosed_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("active", "resolved", "under_observation"),
        allowNull: false,
        defaultValue: "active",
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
      tableName: "patient_conditions",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  PatientCondition.associate = (models) => {
    PatientCondition.belongsTo(models.Patient, {
      foreignKey: "patient_id",
      as: "patient",
    });
  };

  return PatientCondition;
};
