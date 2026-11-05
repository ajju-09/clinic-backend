"use strict";

module.exports = (sequelize, DataTypes) => {
  const CalendarEvent = sequelize.define(
    "CalendarEvent",
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
      doctor_user_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(180),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      event_type: {
        type: DataTypes.STRING(40),
        allowNull: false,
      },
      color_key: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      start_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      end_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      event_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      is_all_day: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      priority: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "normal",
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "scheduled",
      },
      reminder_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      reminder_time: {
        type: DataTypes.TIME,
        allowNull: true,
      },
      reminder_email: {
        type: DataTypes.STRING(254),
        allowNull: true,
      },
      created_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
      },
      updated_by: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "calendar_events",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      paranoid: true,
      deletedAt: "deleted_at",
      indexes: [
        { fields: ["clinic_id", "event_date"], name: "calendar_events_clinic_date_idx" },
        { fields: ["doctor_user_id", "event_date"], name: "calendar_events_doctor_date_idx" },
        { fields: ["clinic_id", "start_at"], name: "calendar_events_clinic_start_idx" },
        { fields: ["reminder_enabled", "event_date", "status"], name: "calendar_events_reminder_idx" },
      ],
    },
  );

  CalendarEvent.associate = (models) => {
    CalendarEvent.belongsTo(models.Clinic, { foreignKey: "clinic_id", as: "clinic" });
    CalendarEvent.belongsTo(models.User, { foreignKey: "doctor_user_id", as: "owner" });
    CalendarEvent.belongsTo(models.User, { foreignKey: "created_by", as: "createdByUser" });
    CalendarEvent.belongsTo(models.User, { foreignKey: "updated_by", as: "updatedByUser" });
    CalendarEvent.hasMany(models.CalendarReminderJob, {
      foreignKey: "event_id",
      as: "reminderJobs",
    });
  };

  return CalendarEvent;
};
