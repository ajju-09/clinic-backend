'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'credentials_sms_status');
    await queryInterface.removeColumn('users', 'credentials_email_status');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'credentials_sms_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'pending',
    });

    await queryInterface.addColumn('users', 'credentials_email_status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'pending',
    });
  },
};