"use strict";

const db = require("../models");
const AppError = require("../utils/AppError");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const clinicAttributes = [
    "id",
    "user_id",
    "name",
    "clinic_type",
    "description",
    "address",
    "address_line_2",
    "city",
    "state",
    "pin_code",
    "phone",
    "alternate_phone",
    "email",
    "website",
    "registration_no",
    "working_hours",
    "timezone",
    "specialties",
    "cover_image_url",
    "created_at",
    "updated_at",
];

const toClinicResponse = (clinic) => {
    const record = clinic.get({ plain: true });
    return {
        id: record.id,
        userId: record.user_id,
        name: record.name,
        clinicType: record.clinic_type,
        description: record.description,
        address: record.address,
        addressLine2: record.address_line_2,
        city: record.city,
        state: record.state,
        pinCode: record.pin_code,
        phone: record.phone,
        alternatePhone: record.alternate_phone,
        email: record.email,
        website: record.website,
        registrationNo: record.registration_no,
        workingHours: record.working_hours,
        timezone: record.timezone || process.env.APP_DEFAULT_TIMEZONE || "Asia/Kolkata",
        specialties: record.specialties || [],
        coverImageUrl: record.cover_image_url,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
};

const normalizeSpecialties = (specialties) => {
    if (!Array.isArray(specialties)) return [];
    const seen = new Set();
    return specialties.reduce((normalized, value) => {
        const specialty = typeof value === "string" ? value.trim() : "";
        const key = specialty.toLocaleLowerCase();
        if (specialty && !seen.has(key)) {
            seen.add(key);
            normalized.push(specialty);
        }
        return normalized;
    }, []);
};

const toDatabaseFields = (data) => {
    const fields = {};
    if (Object.hasOwn(data, "name")) fields.name = data.name;
    if (Object.hasOwn(data, "clinicType")) fields.clinic_type = data.clinicType || null;
    if (Object.hasOwn(data, "description")) fields.description = data.description || null;
    if (Object.hasOwn(data, "address")) fields.address = data.address;
    if (Object.hasOwn(data, "addressLine2")) fields.address_line_2 = data.addressLine2 || null;
    if (Object.hasOwn(data, "city")) fields.city = data.city || null;
    if (Object.hasOwn(data, "state")) fields.state = data.state || null;
    if (Object.hasOwn(data, "pinCode")) fields.pin_code = data.pinCode || null;
    if (Object.hasOwn(data, "phone")) fields.phone = data.phone || null;
    if (Object.hasOwn(data, "alternatePhone")) fields.alternate_phone = data.alternatePhone || null;
    if (Object.hasOwn(data, "email")) fields.email = data.email || null;
    if (Object.hasOwn(data, "website")) fields.website = data.website || null;
    if (Object.hasOwn(data, "registrationNo")) {
        fields.registration_no = data.registrationNo || null;
    }
    if (Object.hasOwn(data, "workingHours")) {
        fields.working_hours = data.workingHours || null;
    }
    if (Object.hasOwn(data, "timezone")) fields.timezone = data.timezone;
    if (Object.hasOwn(data, "specialties")) {
        fields.specialties = normalizeSpecialties(data.specialties);
    }
    return fields;
};

const getClinicProfileService = async (userId) => {
    const clinics = await db.Clinic.findAll({
        attributes: clinicAttributes,
        where: { user_id: userId },
        order: [["created_at", "ASC"]],
    });

    return { success: true, data: clinics.map(toClinicResponse) };
};

const createClinicProfileService = async (userId, clinicData) => {
    const clinic = await db.Clinic.create({
        user_id: userId,
        ...toDatabaseFields(clinicData),
    });

    return {
        success: true,
        message: "Clinic profile created successfully",
        data: toClinicResponse(clinic),
    };
};

const getSingleClinicService = async (userId, clinicId) => {
    const clinic = await db.Clinic.findOne({
        attributes: clinicAttributes,
        where: { id: clinicId, user_id: userId },
    });

    if (!clinic) {
        throw AppError.notFound("Clinic not found");
    }

    return { success: true, data: toClinicResponse(clinic) };
};

const updateClinicProfileService = async (userId, clinicId, clinicData) => {
    const clinic = await db.Clinic.findOne({
        where: { id: clinicId, user_id: userId },
    });

    if (!clinic) {
        throw AppError.notFound("Clinic not found");
    }

    await clinic.update(toDatabaseFields(clinicData));

    return {
        success: true,
        message: "Clinic profile updated successfully",
        data: toClinicResponse(clinic),
    };
};

const deleteClinicProfileService = async (userId, clinicId) => {
    let coverImagePublicId;

    await db.sequelize.transaction(async (transaction) => {
        const clinic = await db.Clinic.findOne({
            where: { id: clinicId, user_id: userId },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!clinic) {
            throw AppError.notFound("Clinic not found");
        }

        const [patientCount, visitCount, expenseCount] = await Promise.all([
            db.Patient.count({
                where: { clinic_id: clinicId },
                transaction,
            }),
            db.PatientVisit.count({
                where: { clinic_id: clinicId },
                transaction,
            }),
            db.Expense.count({
                where: { clinic_id: clinicId },
                transaction,
            }),
        ]);

        if (patientCount > 0 || visitCount > 0 || expenseCount > 0) {
            throw AppError.conflict(
                "This clinic has patient, visit, or expense records. Reassign or remove those records before deleting the clinic.",
            );
        }

        coverImagePublicId = clinic.cover_image_public_id;
        await clinic.destroy({ transaction });
    });

    if (coverImagePublicId) {
        try {
            const deletion = await cloudinary.uploader.destroy(coverImagePublicId, {
                resource_type: "image",
            });
            if (deletion.result !== "ok" && deletion.result !== "not found") {
                console.warn(`[Cloudinary] Clinic cover was not removed: ${coverImagePublicId}`);
            }
        } catch (error) {
            console.error("[Cloudinary] Failed to remove deleted clinic cover:", error.message);
        }
    }

    return {
        success: true,
        message: "Clinic profile deleted successfully",
    };
};

const uploadClinicCoverService = async (userId, clinicId, file) => {
    if (!file) {
        throw AppError.badRequest("Select a cover image to upload");
    }

    if (!isCloudinaryConfigured()) {
        throw new AppError(
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
            503,
            "CLOUDINARY_NOT_CONFIGURED",
        );
    }

    const clinic = await db.Clinic.findOne({
        where: { id: clinicId, user_id: userId },
    });

    if (!clinic) {
        throw AppError.notFound("Clinic not found");
    }

    const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "medipulse/clinic-covers",
                resource_type: "image",
                allowed_formats: ["jpg", "jpeg", "png", "webp"],
                transformation: [
                    { width: 1600, height: 1000, crop: "limit" },
                    { quality: "auto", fetch_format: "auto" },
                ],
            },
            (error, result) => {
                if (error) return reject(error);
                if (!result?.secure_url || !result?.public_id) {
                    return reject(new Error("Cloudinary did not return an image URL"));
                }
                resolve(result);
            },
        );
        stream.end(file.buffer);
    });

    const previousPublicId = clinic.cover_image_public_id;
    try {
        await clinic.update({
            cover_image_url: uploaded.secure_url,
            cover_image_public_id: uploaded.public_id,
        });
    } catch (error) {
        await cloudinary.uploader.destroy(uploaded.public_id, {
            resource_type: "image",
        }).catch((cleanupError) => {
            console.error("[Cloudinary] Failed to remove unlinked clinic cover:", cleanupError.message);
        });
        throw error;
    }

    if (previousPublicId) {
        try {
            const deletion = await cloudinary.uploader.destroy(previousPublicId, {
                resource_type: "image",
            });
            if (deletion.result !== "ok" && deletion.result !== "not found") {
                console.warn(`[Cloudinary] Previous clinic cover was not removed: ${previousPublicId}`);
            }
        } catch (error) {
            console.error("[Cloudinary] Failed to remove previous clinic cover:", error.message);
        }
    }

    return {
        success: true,
        message: "Clinic cover image uploaded successfully",
        data: toClinicResponse(clinic),
    };
};

module.exports = {
    getClinicProfileService,
    createClinicProfileService,
    getSingleClinicService,
    updateClinicProfileService,
    deleteClinicProfileService,
    uploadClinicCoverService,
};