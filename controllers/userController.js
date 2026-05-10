/**
 * @desc create user signup
 * @route POST /api/v1/user/signup
 * @access Public
 */
const signUp = async (req, res) => {
  res.send("signUp");
};

/**
 * @desc create user login
 * @route POST /api/v1/user/login
 * @access Public
 */
const login = async (req, res) => {
  res.send("login");
};

module.exports = {
  signUp,
  login,
};
