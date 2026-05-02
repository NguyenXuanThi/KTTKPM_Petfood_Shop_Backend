const userService = require("../services/userService");
const {
  createUserSchema,
  updateProfileSchema,
  changePasswordSchema,
  updateRoleSchema,
  updateStatusSchema,
  deactivateUserSchema,
  listUsersQuerySchema,
  idParamSchema,
  emailParamSchema,
} = require("../validators/userValidator");

const createUser = async (req, res, next) => {
  try {
    const payload = await createUserSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.createUser(payload);

    return res.status(201).json({
      message: "Create user successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.getUserById(id);

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

const getInternalUserById = getUserById;

const getUserByEmail = async (req, res, next) => {
  try {
    const { email } = await emailParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.getByEmailForAuth(email);

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await userService.getProfile(req.auth.sub);

    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const payload = await updateProfileSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.updateProfile(req.auth.sub, payload);

    return res.status(200).json({
      message: "Update profile successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const changeMyPassword = async (req, res, next) => {
  try {
    const payload = await changePasswordSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.changePassword(req.auth.sub, payload);

    return res.status(200).json({
      message: "Change password successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const listUsers = async (req, res, next) => {
  try {
    const query = await listUsersQuerySchema.validateAsync(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const data = await userService.listUsers(query);

    return res.status(200).json(data);
  } catch (error) {
    return next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const { role } = await updateRoleSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.updateRole(id, role);

    return res.status(200).json({
      message: "Update user role successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const { isActive } = await updateStatusSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (req.auth?.sub === id && isActive === false) {
      const error = new Error("You cannot deactivate your own account");
      error.statusCode = 400;
      throw error;
    }

    const user = await userService.updateStatus(id, isActive);

    return res.status(200).json({
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const deactivateUser = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const { reason } = await deactivateUserSchema.validateAsync(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (req.auth?.sub === id) {
      const error = new Error("You cannot deactivate your own account");
      error.statusCode = 400;
      throw error;
    }

    const user = await userService.deactivateUser(id, reason);

    return res.status(200).json({
      message: "Deactivate user successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const activateUser = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.activateUser(id);

    return res.status(200).json({
      message: "Activate user successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.restoreUser(id);

    return res.status(200).json({
      message: "Restore user successful",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const markLastLogin = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.markLastLogin(id);

    return res.status(200).json({
      message: "Last login updated",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

const markReactivationRequested = async (req, res, next) => {
  try {
    const { id } = await idParamSchema.validateAsync(req.params, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    const user = await userService.markReactivationRequested(id);

    return res.status(200).json({
      message: "Reactivation request timestamp updated",
      user,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createUser,
  getUserById,
  getInternalUserById,
  getUserByEmail,
  getMe,
  updateMe,
  changeMyPassword,
  listUsers,
  updateUserRole,
  updateUserStatus,
  deactivateUser,
  activateUser,
  restoreUser,
  markLastLogin,
  markReactivationRequested,
};
