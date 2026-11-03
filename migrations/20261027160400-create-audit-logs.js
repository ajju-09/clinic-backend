"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "audit_logs",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          action: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          entity: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          entity_id: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          user_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          ip: {
            type: Sequelize.STRING(45),
            allowNull: true,
          },
          user_agent: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          details: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("audit_logs", ["action"], {
        name: "audit_logs_action_idx",
        transaction,
      });
      await queryInterface.addIndex("audit_logs", ["entity"], {
        name: "audit_logs_entity_idx",
        transaction,
      });
      await queryInterface.addIndex("audit_logs", ["user_id"], {
        name: "audit_logs_user_id_idx",
        transaction,
      });
      await queryInterface.addIndex("audit_logs", ["created_at"], {
        name: "audit_logs_created_at_idx",
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("audit_logs");
  },
};
