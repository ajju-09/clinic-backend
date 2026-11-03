"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "users",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          username: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          first_name: {
            type: Sequelize.STRING(50),
            allowNull: false,
          },
          last_name: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          password: {
            type: Sequelize.STRING(255), // bcrypt hash
            allowNull: false,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          email_verified_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          otp: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          attempt: {
            type: Sequelize.TINYINT.UNSIGNED,
            allowNull: false,
            defaultValue: 0,
          },
          expires_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          otp_verified_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },

          role: {
            type: Sequelize.STRING(30),
            allowNull: false,
            defaultValue: "user",
          },
          status: {
            type: Sequelize.STRING(30),
            allowNull: false,
            defaultValue: "pending",
          },
          credentials_sms_status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "pending",
          },
          credentials_email_status: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: "pending",
          },
          is_login: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          is_verified: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          last_login_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          password_change_at: {
            type: Sequelize.DATE,
            allowNull: true,
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
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction },
      );

      await queryInterface.addIndex("users", ["email"], {
        name: "users_email_unique",
        unique: true,
        transaction,
      });
      await queryInterface.addIndex("users", ["username"], {
        name: "users_username_unique",
        unique: true,
        transaction,
      });
      await queryInterface.addIndex("users", ["role"], {
        name: "users_role_idx",
        transaction,
      });
      await queryInterface.addIndex("users", ["status"], {
        name: "users_status_idx",
        transaction,
      });
      await queryInterface.addIndex("users", ["deleted_at"], {
        name: "users_deleted_at_idx",
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("users");
  },
};
