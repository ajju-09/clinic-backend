"use strict";

const express = require("express");
const route = express.Router();
const clinicController = require("../controllers/clinic.controller");
const validationMiddleware = require("../middleware/validation.middleware");
const { authenticate } = require("../middleware/auth.middleware");
const clinicCoverUpload = require("../middleware/clinic-cover-upload.middleware");
const {
    createClinicSchema,
    updateClinicSchema,
    clinicIdParamSchema,
} = require("../helper/joiValidation");

// get or list clinic profile for login doctor
route.get("/", authenticate, clinicController.getClinicProfile);

// create new cliinc profile
route.post(
    "/",
    authenticate,
    validationMiddleware(createClinicSchema),
    clinicController.createClinicProfile,
);

// get single clinic details
route.get(
    "/:id",
    authenticate,
    validationMiddleware(clinicIdParamSchema, "params"),
    clinicController.getSingleClinic,
);

// Update clinic information 
route.put(
    "/:id",
    authenticate,
    validationMiddleware(clinicIdParamSchema, "params"),
    validationMiddleware(updateClinicSchema),
    clinicController.updateClinicProfile,
);

route.delete(
    "/:id",
    authenticate,
    validationMiddleware(clinicIdParamSchema, "params"),
    clinicController.deleteClinicProfile,
);

route.post(
    "/:id/cover",
    authenticate,
    validationMiddleware(clinicIdParamSchema, "params"),
    clinicCoverUpload,
    clinicController.uploadClinicCover,
);

module.exports = route;
