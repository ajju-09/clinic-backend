"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        "doctor_profiles",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          user_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            unique: true,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          medical_registration_no: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          council: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          specialization: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          qualification: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          experience_years: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          clinic_name: {
            type: Sequelize.STRING(150),
            allowNull: true,
          },
          clinic_address: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          bio: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_completed: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
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
        },
        { transaction }
      );

      await queryInterface.addIndex("doctor_profiles", ["user_id"], {
        name: "doctor_profiles_user_id_unique",
        unique: true,
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("doctor_profiles");
  },
};
