const express = require("express");
const userContoller = require("../controllers/userController");

const router = express.Router();

router.post("/signup", userContoller.signUp);
router.post("/login", userContoller.login);

module.exports = router;
