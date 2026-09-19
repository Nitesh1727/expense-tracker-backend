import * as authService from '../services/auth.service.js';

async function requestOtp(req, res) {
  const { phone } = req.valid.body;
  const result = await authService.requestOtp(phone);
  res.status(200).json({ success: true, ...result });
}

async function verifyOtp(req, res) {
  const { phone, code } = req.valid.body;
  const { user, token, isNewUser } = await authService.verifyOtpAndAuthenticate(phone, code);
  res.status(200).json({ user, token, isNewUser });
}

async function signupEmail(req, res) {
  const { user, token } = await authService.signupEmail(req.valid.body);
  res.status(201).json({ user, token });
}

async function resendVerification(req, res) {
  await authService.resendVerificationEmail(req.userId);
  res.status(200).json({ success: true });
}

async function verifyEmail(req, res) {
  const user = await authService.verifyEmail(req.userId, req.valid.body.code);
  res.status(200).json({ user });
}

async function forgotPassword(req, res) {
  await authService.requestPasswordReset(req.valid.body.email);
  // Always success — see auth.service.requestPasswordReset for why this
  // can't reveal whether the email has an account.
  res.status(200).json({ success: true });
}

async function resetPassword(req, res) {
  await authService.resetPassword(req.valid.body);
  res.status(200).json({ success: true });
}

async function changePassword(req, res) {
  await authService.changePassword(req.userId, req.valid.body);
  res.status(200).json({ success: true });
}

async function loginEmail(req, res) {
  const { user, token } = await authService.loginEmail(req.valid.body);
  res.status(200).json({ user, token });
}

async function getMe(req, res) {
  const user = await authService.getProfile(req.userId);
  res.status(200).json({ user });
}

async function updateMe(req, res) {
  const user = await authService.updateProfile(req.userId, req.valid.body);
  res.status(200).json({ user });
}

async function deleteMe(req, res) {
  await authService.deleteAccount(req.userId);
  res.status(204).send();
}

export {
  requestOtp,
  verifyOtp,
  signupEmail,
  resendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  loginEmail,
  getMe,
  updateMe,
  deleteMe,
};
