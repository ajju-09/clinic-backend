"use strict";

module.exports = (sequelize, DataTypes) => {
  const MedicineBatch = sequelize.define(
    "MedicineBatch",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      medicine_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      batch_no: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      quantity: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      purchase_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      purchase_price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      supplier: {
        type: DataTypes.STRING(255),
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
      tableName: "medicine_batches",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { fields: ["medicine_id"] },
        { fields: ["expiry_date"] },
      ],
    },
  );

  MedicineBatch.associate = (models) => {
    MedicineBatch.belongsTo(models.Medicine, {
      foreignKey: "medicine_id",
      as: "medicine",
    });
    MedicineBatch.hasMany(models.StockMovement, {
      foreignKey: "batch_id",
      as: "stockMovements",
    });
  };

  return MedicineBatch;
};
