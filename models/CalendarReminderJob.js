"use strict";

module.exports = (sequelize, DataTypes) => {
  const CalendarReminderJob = sequelize.define(
    "CalendarReminderJob",
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      event_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      recipient_email: {
        type: DataTypes.STRING(254),
        allowNull: false,
      },
      scheduled_at_utc: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pending",
      },
      attempts: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      last_attempt_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      sent_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      idempotency_key: {
        type: DataTypes.STRING(120),
        allowNull: false,
        unique: true,
      },
      claim_token: {
        type: DataTypes.STRING(36),
        allowNull: true,
      },
    },
    {
      tableName: "calendar_reminder_jobs",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        { unique: true, fields: ["idempotency_key"], name: "calendar_reminder_idempotency_unique" },
        { fields: ["status", "scheduled_at_utc"], name: "calendar_reminder_due_idx" },
        { fields: ["event_id"], name: "calendar_reminder_event_idx" },
      ],
    },
  );

  CalendarReminderJob.associate = (models) => {
    CalendarReminderJob.belongsTo(models.CalendarEvent, {
      foreignKey: "event_id",
      as: "event",
    });
  };

  return CalendarReminderJob;
};
