import User from '../models/user.model.js';
import * as otpService from './otp.service.js';
import * as verificationCodeService from './verificationCode.service.js';
import * as categoryService from './category.service.js';
import * as expenseService from './expense.service.js';
import Category from '../models/category.model.js';
import ApiError from '../utils/ApiError.js';
import { signToken } from '../utils/jwt.util.js';
import { hash, compareHash } from '../utils/hash.util.js';
import { sendMail } from '../utils/mailer.util.js';
import { logoAttachment, verificationEmailHtml, passwordResetEmailHtml } from '../utils/emailTemplates.util.js';

/**
 * Email verification is a one-time confirmation, not a login gate — per
 * explicit product decision ("we will not verify everytime"), an unverified
 * account can sign up, log in, and use the app fully; `emailVerified` just
 * tracks whether the confirmation happened, for whenever that matters later
 * (e.g. a "verify your email" banner), and nothing here currently blocks on
 * it being false.
 */
async function sendVerificationEmail(user) {
  const code = await verificationCodeService.issueCode({ field: 'email', value: user.email, purpose: 'email-verify' });
  await sendMail({
    to: user.email,
    subject: 'Verify your email — SpendWise',
    html: verificationEmailHtml({ name: user.name, code }),
    attachments: [logoAttachment()],
  });
}

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

  // Best-effort — signup still succeeds even if email delivery fails (SMTP
  // not configured yet, provider hiccup, ...). The user can always trigger
  // another send later; verification isn't a login gate (see auth.service
  // class-level note), so there's nothing to block on here.
  try {
    await sendVerificationEmail(user);
  } catch (err) {
    console.error('[auth] Failed to send verification email:', err.message);
  }

  const token = signToken(user._id.toString());
  return { user, token };
}

async function resendVerificationEmail(userId) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.authProvider !== 'email' || !user.email) {
    throw new ApiError(400, 'This account has no email to verify');
  }
  if (user.emailVerified) {
    throw new ApiError(400, 'Email is already verified');
  }
  await sendVerificationEmail(user);
}

async function verifyEmail(userId, code) {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  if (!user.email) throw new ApiError(400, 'This account has no email to verify');

  await verificationCodeService.verifyCode({ field: 'email', value: user.email, purpose: 'email-verify', code });
  user.emailVerified = true;
  await user.save();
  return user;
}

/**
 * Doesn't reveal whether the email exists — same generic "if that email has
 * an account, a code is on its way" success either way, so this can't be
 * used to enumerate registered addresses. Silently no-ops (still returns
 * success) for an unknown email or a phone-only account with no password to
 * reset.
 */
async function requestPasswordReset(email) {
  const user = await User.findOne({ email });
  if (!user || user.authProvider !== 'email') return;

  const code = await verificationCodeService.issueCode({ field: 'email', value: email, purpose: 'password-reset' });
  // Best-effort, same as signup's verification email — letting this throw
  // would 500 *only* for a registered email (a non-existent one returns
  // above before ever reaching this point), which defeats the whole point
  // of this function always looking the same from the outside regardless
  // of whether the email has an account.
  try {
    await sendMail({
      to: email,
      subject: 'Reset your password — SpendWise',
      html: passwordResetEmailHtml({ name: user.name, code }),
      attachments: [logoAttachment()],
    });
  } catch (err) {
    console.error('[auth] Failed to send password reset email:', err.message);
  }
}

async function resetPassword({ email, code, newPassword }) {
  await verificationCodeService.verifyCode({ field: 'email', value: email, purpose: 'password-reset', code });

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(400, 'Incorrect code');

  user.passwordHash = await hash(newPassword);
  await user.save();
}

/** Logged-in path (Settings → Account) — unlike resetPassword, this requires knowing the current password rather than a code emailed to prove account ownership. */
async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.passwordHash) {
    throw new ApiError(400, 'This account has no password to change');
  }

  const isValid = await compareHash(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, 'Current password is incorrect');
  }

  user.passwordHash = await hash(newPassword);
  await user.save();
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
 * Editable profile fields (name, avatar, monthlyReportEnabled) — deliberately
 * excludes email, which is fixed once set (see updateProfileSchema).
 */
async function updateProfile(userId, updates) {
  const user = await User.findByIdAndUpdate(userId, updates, { new: true });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}

/**
 * No auth — reached by clicking a link in an emailed report, so there's no
 * session to check. The token itself (opaque, unique per user, see
 * user.model.js) is what authorizes this. Silently no-ops for an unknown/
 * already-used token rather than erroring, so re-clicking an old email's
 * link after already unsubscribing isn't a broken experience.
 */
async function unsubscribeFromReports(token) {
  await User.updateOne({ unsubscribeToken: token }, { monthlyReportEnabled: false });
}

async function deleteAccount(userId) {
  await expenseService.deleteAllForUser(userId);
  await Category.deleteMany({ userId });
  await User.findByIdAndDelete(userId);
}

export {
  requestOtp,
  verifyOtpAndAuthenticate,
  signupEmail,
  resendVerificationEmail,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  changePassword,
  unsubscribeFromReports,
  loginEmail,
  getProfile,
  updateProfile,
  deleteAccount,
};
