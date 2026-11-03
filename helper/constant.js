"use strict";

const USER_ROLES = Object.freeze({
  ADMIN: "admin",
  MD: "md",
});

const USER_STATUS = Object.freeze({
  PENDING: "pending",
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended",
});

const CREDENTIAL_DELIVERY_STATUS = Object.freeze({
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
});

module.exports = {
  USER_ROLES,
  USER_STATUS,
  CREDENTIAL_DELIVERY_STATUS,
  USER_ROLE_VALUES: Object.values(USER_ROLES),
  USER_STATUS_VALUES: Object.values(USER_STATUS),
  CREDENTIAL_DELIVERY_STATUS_VALUES: Object.values(CREDENTIAL_DELIVERY_STATUS),
};
