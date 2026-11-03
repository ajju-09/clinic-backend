"use strict";

module.exports = (sequelize, DataTypes) => {
  const Medicine = sequelize.define(
    "Medicine",
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
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      generic_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      dosage_form: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      strength: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      unit: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      reorder_level: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 10,
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
      tableName: "medicines",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      indexes: [{ fields: ["clinic_id", "name"] }],
    },
  );

  Medicine.associate = (models) => {
    Medicine.belongsTo(models.Clinic, { foreignKey: "clinic_id", as: "clinic" });
    Medicine.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "createdByUser",
    });
    Medicine.hasMany(models.MedicineBatch, {
      foreignKey: "medicine_id",
      as: "batches",
    });
    Medicine.hasMany(models.StockMovement, {
      foreignKey: "medicine_id",
      as: "stockMovements",
    });
  };

  return Medicine;
};
