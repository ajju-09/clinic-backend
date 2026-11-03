"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let columns = await queryInterface.describeTable("doctor_profiles");
      const addColumnIfMissing = async (name, definition) => {
        if (!columns[name]) {
          await queryInterface.addColumn("doctor_profiles", name, definition, {
            transaction,
          });
          columns[name] = definition;
        }
      };

      await addColumnIfMissing("profile_image_url", {
        type: Sequelize.STRING(2048),
        allowNull: true,
      });
      await addColumnIfMissing("profile_image_public_id", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await addColumnIfMissing("display_name", {
        type: Sequelize.STRING(150),
        allowNull: true,
      });
      await addColumnIfMissing("gender", {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
      await addColumnIfMissing("professional_title", {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
      await addColumnIfMissing("experience_start_date", {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
      await addColumnIfMissing("primary_phone", {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
      await addColumnIfMissing("alternate_phone", {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
      await addColumnIfMissing("professional_email", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
      await addColumnIfMissing("languages", {
        type: Sequelize.JSON,
        allowNull: true,
      });
      await addColumnIfMissing("consultation_fee", {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      });
      await addColumnIfMissing("profile_completion_status", {
        type: Sequelize.ENUM("incomplete", "in_progress", "completed"),
        allowNull: false,
        defaultValue: "incomplete",
      });
      await addColumnIfMissing("is_active", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
      await addColumnIfMissing("deleted_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });

      if (columns.profile_image) {
        await queryInterface.sequelize.query(
          "UPDATE doctor_profiles SET profile_image_url = profile_image WHERE profile_image_url IS NULL",
          { transaction },
        );
      }
      if (columns.phone) {
        await queryInterface.sequelize.query(
          "UPDATE doctor_profiles SET primary_phone = phone WHERE primary_phone IS NULL",
          { transaction },
        );
      }
      if (columns.is_completed) {
        await queryInterface.sequelize.query(
          "UPDATE doctor_profiles SET profile_completion_status = CASE WHEN is_completed = 1 THEN 'completed' ELSE 'incomplete' END",
          { transaction },
        );
      }

      const [profilesWithoutCode] = await queryInterface.sequelize.query(
        "SELECT id FROM doctor_profiles WHERE md_code IS NULL",
        { transaction },
      );
      for (const profile of profilesWithoutCode) {
        await queryInterface.sequelize.query(
          "UPDATE doctor_profiles SET md_code = ? WHERE id = ?",
          {
            replacements: [`MD-MIG-${profile.id}`, profile.id],
            transaction,
          },
        );
      }

      await queryInterface.changeColumn(
        "doctor_profiles",
        "md_code",
        {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        { transaction },
      );
      await queryInterface.changeColumn(
        "doctor_profiles",
        "experience_years",
        {
          type: Sequelize.SMALLINT.UNSIGNED,
          allowNull: true,
        },
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const columns = await queryInterface.describeTable("doctor_profiles");
      const addedColumns = [
        "profile_image_url",
        "profile_image_public_id",
        "display_name",
        "gender",
        "professional_title",
        "experience_start_date",
        "primary_phone",
        "alternate_phone",
        "professional_email",
        "languages",
        "consultation_fee",
        "profile_completion_status",
        "is_active",
        "deleted_at",
      ];
      for (const column of addedColumns) {
        if (columns[column]) {
          await queryInterface.removeColumn("doctor_profiles", column, {
            transaction,
          });
        }
      }

      await queryInterface.changeColumn(
        "doctor_profiles",
        "md_code",
        {
          type: Sequelize.STRING(20),
          allowNull: true,
        },
        { transaction },
      );
      await queryInterface.changeColumn(
        "doctor_profiles",
        "experience_years",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        { transaction },
      );
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
