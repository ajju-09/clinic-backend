const asyncHandler = require("../utils/asyncHandler");
const clinicServices = require("../services/clinic.services");


const getClinicProfile = asyncHandler(async (req, res) => {
    const result = await clinicServices.getClinicProfileService(req.user.id);
    res.status(200).json(result);
});

const createClinicProfile = asyncHandler(async (req, res) => {
    const result = await clinicServices.createClinicProfileService(req.user.id, req.body);
    res.status(201).json(result);
});

const getSingleClinic = asyncHandler(async (req, res) => {
    const result = await clinicServices.getSingleClinicService(req.user.id, req.params.id);
    res.status(200).json(result);
});

const updateClinicProfile = asyncHandler(async (req, res) => {
    const result = await clinicServices.updateClinicProfileService(
        req.user.id,
        req.params.id,
        req.body,
    );
    res.status(200).json(result);
});

const deleteClinicProfile = asyncHandler(async (req, res) => {
    const result = await clinicServices.deleteClinicProfileService(
        req.user.id,
        req.params.id,
    );
    res.status(200).json(result);
});

const uploadClinicCover = asyncHandler(async (req, res) => {
    const result = await clinicServices.uploadClinicCoverService(
        req.user.id,
        req.params.id,
        req.file,
    );
    res.status(200).json(result);
});

module.exports = {
    getClinicProfile,
    createClinicProfile,
    getSingleClinic,
    updateClinicProfile,
    deleteClinicProfile,
    uploadClinicCover,
};