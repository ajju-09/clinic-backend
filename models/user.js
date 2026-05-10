"use strict";

const { allow } = require("joi");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      countryCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      phone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      lastname: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("ADMIN", "DOCTOR", "PATIENT"),
        allowNull: false,
      },
      profile: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      gender: {
        type: DataTypes.ENUM("MALE", "FEMALE", "OTHER"),
        allowNull: true,
      },
      birthdate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      state: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      pincode: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      isOnline: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      isVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      isLogin: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      isDeleted: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      isBlock: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: null,
        allowNull: true,
      },
    },
    {
      tableName: "users",
      timestamps: false,
    },
  );

  return User;
};
