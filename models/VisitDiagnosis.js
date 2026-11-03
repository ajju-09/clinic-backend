"use strict";

module.exports = (sequelize, DataTypes) => {
  const VisitDiagnosis = sequelize.define(
    "VisitDiagnosis",
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
      diagnosis_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      diagnosis_code: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      diagnosis_type: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "visit_diagnoses",
      timestamps: false,
    }
  );

  VisitDiagnosis.associate = (models) => {
    VisitDiagnosis.belongsTo(models.PatientVisit, {
      foreignKey: "visit_id",
      as: "visit",
    });
  };

  return VisitDiagnosis;
};
