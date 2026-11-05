"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable("calendar_events", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        clinic_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "clinics", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        doctor_user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        title: { type: Sequelize.STRING(180), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        event_type: { type: Sequelize.STRING(40), allowNull: false },
        color_key: { type: Sequelize.STRING(30), allowNull: false },
        location: { type: Sequelize.STRING(255), allowNull: true },
        start_at: { type: Sequelize.DATE, allowNull: true },
        end_at: { type: Sequelize.DATE, allowNull: true },
        event_date: { type: Sequelize.DATEONLY, allowNull: false },
        is_all_day: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        priority: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "normal" },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "scheduled" },
        reminder_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        reminder_time: { type: Sequelize.TIME, allowNull: true },
        reminder_email: { type: Sequelize.STRING(254), allowNull: true },
        created_by: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        updated_by: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      }, { transaction });

      await queryInterface.addIndex("calendar_events", ["clinic_id", "event_date"], {
        name: "calendar_events_clinic_date_idx",
        transaction,
      });
      await queryInterface.addIndex("calendar_events", ["doctor_user_id", "event_date"], {
        name: "calendar_events_doctor_date_idx",
        transaction,
      });
      await queryInterface.addIndex("calendar_events", ["clinic_id", "start_at"], {
        name: "calendar_events_clinic_start_idx",
        transaction,
      });
      await queryInterface.addIndex(
        "calendar_events",
        ["reminder_enabled", "event_date", "status"],
        { name: "calendar_events_reminder_idx", transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendar_events");
  },
};
