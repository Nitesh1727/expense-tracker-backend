import express from 'express';
import * as publicController from '../controllers/public.controller.js';

const { Router } = express;

const router = Router();

// No requireAuth — reached by clicking a link in an emailed report, where
// there's no session. See public.controller.js / auth.service's
// unsubscribeFromReports for why the token itself is what authorizes this.
// GET is a person clicking the link in a browser; POST is Gmail/Outlook's
// own native one-click "Unsubscribe" button hitting the same URL directly
// (RFC 8058 — see mailer.util.js's List-Unsubscribe-Post header).
router.get('/unsubscribe/:token', publicController.unsubscribe);
router.post('/unsubscribe/:token', publicController.unsubscribeOneClick);

export default router;
