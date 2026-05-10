/**
 * @desc create user signup
 * @route POST /api/v1/user/signup
 * @access Public
 */
const signUp = async (req, res, next) => {
  try {
    res.send("signup");
  } catch (error) {
    next(error);
  }
};

/**
 * @desc create user login
 * @route POST /api/v1/user/login
 * @access Public
 */
const login = async (req, res, next) => {
  try {
    res.send("login");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  signUp,
  login,
};
