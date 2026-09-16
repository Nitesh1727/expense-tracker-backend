const User = require('../models/user.model');
const otpService = require('./otp.service');
const categoryService = require('./category.service');
const expenseService = require('./expense.service');
const Category = require('../models/category.model');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt.util');
const { hash, compareHash } = require('../utils/hash.util');

async function requestOtp(phone) {
  return otpService.requestOtp(phone);
}

/** Shared by every signup path — a brand new user should never hit the expense screen with no categories. */
async function createUserWithDefaults(fields) {
  const user = await User.create(fields);
  await categoryService.seedDefaultCategories(user._id);
  return user;
}

async function verifyOtpAndAuthenticate(phone, code) {
  await otpService.verifyOtp(phone, code);

  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    user = await createUserWithDefaults({ phone, authProvider: 'phone' });
    isNewUser = true;
  }

  const token = signToken(user._id.toString());
  return { user, token, isNewUser };
}

async function signupEmail({ email, password, name }) {
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hash(password);
  const user = await createUserWithDefaults({ email, passwordHash, name, authProvider: 'email' });

  const token = signToken(user._id.toString());
  return { user, token };
}

async function loginEmail({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  const isValid = await compareHash(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  const token = signToken(user._id.toString());
  return { user, token };
}

async function getProfile(userId) {
  return User.findById(userId);
}

/**
 * Used both for the optional post-signup "complete your profile" step and
 * for editing profile fields later — same endpoint, both are just a partial
 * update. Works regardless of which method the user originally signed up
 * with (a phone user can add an email here; it's just a profile field, not
 * a second login method — they'd still need the email+password flow's own
 * signup to log in with it, since no password gets set here).
 */
async function updateProfile(userId, updates) {
  if (updates.email) {
    const existing = await User.findOne({ email: updates.email, _id: { $ne: userId } });
    if (existing) {
      throw new ApiError(409, 'Another account already uses this email');
    }
  }

  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}

async function deleteAccount(userId) {
  await expenseService.deleteAllForUser(userId);
  await Category.deleteMany({ userId });
  await User.findByIdAndDelete(userId);
}

module.exports = {
  requestOtp,
  verifyOtpAndAuthenticate,
  signupEmail,
  loginEmail,
  getProfile,
  updateProfile,
  deleteAccount,
};
