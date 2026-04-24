const { Hono } = require('hono');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateAuth, validateChangePassword } = require('../middleware/validator');

const auth = new Hono();

auth.post('/register',    validateAuth,           authController.register);
auth.post('/login',       validateAuth,           authController.login);
auth.post('/refresh',                             authController.refresh);
auth.post('/logout',                              authController.logout);
auth.post('/logout-all',  authenticateToken,      authController.logoutAll);
auth.get('/me',           authenticateToken,      authController.me);
auth.put('/password',     authenticateToken, validateChangePassword, authController.changePassword);

module.exports = auth;
