const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { validateAuth, validateChangePassword } = require('../middleware/validator');

// Registro e inicio de sesión
router.post('/register', validateAuth, authController.register);
router.post('/login',    validateAuth, authController.login);

// Gestión de tokens
router.post('/refresh',     authController.refresh);
router.post('/logout',      authController.logout);
router.post('/logout-all',  authenticateToken, authController.logoutAll);

// Perfil y contraseña (requieren access token)
router.get('/me',       authenticateToken, authController.me);
router.put('/password', authenticateToken, validateChangePassword, authController.changePassword);

module.exports = router;
