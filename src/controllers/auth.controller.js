const authService = require('../services/auth.service');

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

module.exports = { requestOtp, verifyOtp, signupEmail, loginEmail, getMe, updateMe, deleteMe };
