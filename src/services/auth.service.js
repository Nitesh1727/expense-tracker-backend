const User = require('../models/user.model');
const otpService = require('./otp.service');
const categoryService = require('./category.service');
const expenseService = require('./expense.service');
const Category = require('../models/category.model');
const { signToken } = require('../utils/jwt.util');

async function requestOtp(phone) {
  return otpService.requestOtp(phone);
}

async function verifyOtpAndAuthenticate(phone, code) {
  await otpService.verifyOtp(phone, code);

  let user = await User.findOne({ phone });
  let isNewUser = false;

  if (!user) {
    user = await User.create({ phone, authProvider: 'phone' });
    isNewUser = true;
  }

  if (isNewUser) {
    await categoryService.seedDefaultCategories(user._id);
  }

  const token = signToken(user._id.toString());
  return { user, token };
}

async function getProfile(userId) {
  return User.findById(userId);
}

async function deleteAccount(userId) {
  await expenseService.deleteAllForUser(userId);
  await Category.deleteMany({ userId });
  await User.findByIdAndDelete(userId);
}

module.exports = { requestOtp, verifyOtpAndAuthenticate, getProfile, deleteAccount };
