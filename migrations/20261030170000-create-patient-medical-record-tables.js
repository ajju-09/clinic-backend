"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const timestamps = {
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
    };
    const patientReference = {
      model: "patients",
      key: "id",
    };
    const visitReference = {
      model: "patient_visits",
      key: "id",
    };
    const prescriptionReference = {
      model: "prescriptions",
      key: "id",
    };

    try {
      await queryInterface.createTable(
        "patients",
        {
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
          uhid: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          first_name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          last_name: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          date_of_birth: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          gender: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          blood_group: {
            type: Sequelize.STRING(5),
            allowNull: true,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          alternate_phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          email: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          address: {
            type: Sequelize.TEXT,
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
          marital_status: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          occupation: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          registration_date: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          is_active: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          ...timestamps,
          deleted_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("patients", ["clinic_id", "uhid"], {
        name: "patients_clinic_uhid_unique",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
        "patient_emergency_contacts",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          contact_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          relationship: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          phone: {
            type: Sequelize.STRING(20),
            allowNull: false,
          },
          alternate_phone: {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          ...timestamps,
        },
        { transaction }
      );

      await queryInterface.createTable(
        "patient_allergies",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          allergy_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          reaction: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          severity: {
            type: Sequelize.ENUM("mild", "moderate", "severe"),
            allowNull: true,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          ...timestamps,
        },
        { transaction }
      );

      await queryInterface.createTable(
        "patient_conditions",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          condition_name: {
            type: Sequelize.STRING(150),
            allowNull: false,
          },
          diagnosed_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM("active", "resolved", "under_observation"),
            allowNull: false,
            defaultValue: "active",
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          ...timestamps,
        },
        { transaction }
      );

      await queryInterface.createTable(
        "patient_visits",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          clinic_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "clinics", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          doctor_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          visit_number: {
            type: Sequelize.STRING(30),
            allowNull: false,
          },
          visit_date: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          visit_type: {
            type: Sequelize.ENUM("new", "follow_up", "emergency"),
            allowNull: false,
          },
          chief_complaint: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          symptoms: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          medical_history: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          examination_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          temperature: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          blood_pressure_systolic: {
            type: Sequelize.SMALLINT,
            allowNull: true,
          },
          blood_pressure_diastolic: {
            type: Sequelize.SMALLINT,
            allowNull: true,
          },
          pulse_rate: {
            type: Sequelize.SMALLINT,
            allowNull: true,
          },
          respiratory_rate: {
            type: Sequelize.SMALLINT,
            allowNull: true,
          },
          oxygen_saturation: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true,
          },
          weight: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          height: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          diagnosis_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          treatment_plan: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          follow_up_date: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          doctor_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING(30),
            allowNull: false,
            defaultValue: "completed",
          },
          ...timestamps,
        },
        { transaction }
      );

      await queryInterface.addIndex("patient_visits", ["patient_id", "visit_date"], {
        name: "patient_visits_patient_date_idx",
        transaction,
      });
      await queryInterface.addIndex("patient_visits", ["clinic_id", "visit_number"], {
        name: "patient_visits_clinic_number_unique",
        unique: true,
        transaction,
      });

      await queryInterface.createTable(
        "visit_diagnoses",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          visit_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: visitReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          diagnosis_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          diagnosis_code: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          diagnosis_type: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "prescriptions",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          visit_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: visitReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          doctor_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          prescription_date: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          instructions: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          ...timestamps,
        },
        { transaction }
      );

      await queryInterface.createTable(
        "prescription_items",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          prescription_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: prescriptionReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          medicine_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          dosage: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          frequency: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          duration: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          quantity: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          route: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          timing: {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          instructions: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "lab_orders",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          visit_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: visitReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          patient_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: patientReference,
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          test_name: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          test_code: {
            type: Sequelize.STRING(30),
            allowNull: true,
          },
          instructions: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          status: {
            type: Sequelize.STRING(30),
            allowNull: false,
            defaultValue: "ordered",
          },
          ordered_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          completed_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          result_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          report_url: {
            type: Sequelize.STRING(2048),
            allowNull: true,
          },
        },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      for (const table of [
        "lab_orders",
        "prescription_items",
        "prescriptions",
        "visit_diagnoses",
        "patient_visits",
        "patient_conditions",
        "patient_allergies",
        "patient_emergency_contacts",
        "patients",
      ]) {
        await queryInterface.dropTable(table, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
