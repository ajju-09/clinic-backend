"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable("calendar_reminder_jobs", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        event_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "calendar_events", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        recipient_email: { type: Sequelize.STRING(254), allowNull: false },
        scheduled_at_utc: { type: Sequelize.DATE, allowNull: false },
        timezone: { type: Sequelize.STRING(64), allowNull: false },
        status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "pending" },
        attempts: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        last_attempt_at: { type: Sequelize.DATE, allowNull: true },
        sent_at: { type: Sequelize.DATE, allowNull: true },
        last_error: { type: Sequelize.TEXT, allowNull: true },
        idempotency_key: { type: Sequelize.STRING(120), allowNull: false },
        claim_token: { type: Sequelize.STRING(36), allowNull: true },
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
      }, { transaction });
      await queryInterface.addIndex("calendar_reminder_jobs", ["idempotency_key"], {
        unique: true,
        name: "calendar_reminder_idempotency_unique",
        transaction,
      });
      await queryInterface.addIndex(
        "calendar_reminder_jobs",
        ["status", "scheduled_at_utc"],
        { name: "calendar_reminder_due_idx", transaction },
      );
      await queryInterface.addIndex("calendar_reminder_jobs", ["event_id"], {
        name: "calendar_reminder_event_idx",
        transaction,
      });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("calendar_reminder_jobs");
  },
};
