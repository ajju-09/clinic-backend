"use strict";

module.exports = (sequelize, DataTypes) => {
  const CalendarDayNote = sequelize.define(
    "CalendarDayNote",
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
      note_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      note: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      tableName: "calendar_day_notes",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      indexes: [
        {
          unique: true,
          fields: ["clinic_id", "doctor_user_id", "note_date"],
          name: "calendar_day_notes_owner_date_unique",
        },
      ],
    },
  );

  CalendarDayNote.associate = (models) => {
    CalendarDayNote.belongsTo(models.Clinic, { foreignKey: "clinic_id", as: "clinic" });
    CalendarDayNote.belongsTo(models.User, { foreignKey: "doctor_user_id", as: "owner" });
  };

  return CalendarDayNote;
};
