"use strict";

module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    "AuditLog",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      details: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "audit_logs",
      timestamps: true,
      updatedAt: false,
      createdAt: "created_at",
    }
  );

  AuditLog.associate = (models) => {
    AuditLog.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return AuditLog;
};
