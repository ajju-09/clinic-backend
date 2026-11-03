
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        "clinics",
        {
          // 1. Primary key and relationship
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },

          user_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: {
              model: "users",
              key: "id",
            },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },

          // 2. Basic clinic information
          name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },

          clinic_type: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },

          specialties: {
            type: Sequelize.JSON,
            allowNull: true,
          },

          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },

          registration_no: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          // 3. Contact information
          phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },

          alternate_phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },

          email: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },

          website: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },

          // 4. Address information
          address: {
            type: Sequelize.TEXT,
            allowNull: false,
          },

          address_line_2: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },

          city: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          state: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },

          pin_code: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },

          // 5. Operational information
          working_hours: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },

          // 6. Clinic cover image
          cover_image_url: {
            type: Sequelize.STRING(2048),
            allowNull: true,
          },

          cover_image_public_id: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },

          // 7. Timestamps
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

      // Index for doctor-wise clinic lookup
      await queryInterface.addIndex("clinics", ["user_id"], {
        name: "clinics_user_id_idx",
        transaction,
      });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("clinics");
  },
};
