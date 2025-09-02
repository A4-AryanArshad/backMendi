const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  logout,
  getMe,
  updateDetails,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  updateArtistProfile,
  deactivateAccount
} = require('../controllers/authController');

const { protect, authorize, authRateLimit } = require('../middleware/auth');

const router = express.Router();

// Validation rules
const registerValidation = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .isMobilePhone(['en-GB', 'en-US'])
    .withMessage('Please provide a valid phone number'),
  body('userType')
    .isIn(['client', 'artist'])
    .withMessage('User type must be either client or artist'),
  body('location.city')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('City must be at least 2 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateDetailsValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone(['en-GB', 'en-US'])
    .withMessage('Please provide a valid phone number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
];

const updatePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

const artistProfileValidation = [
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  body('specialties')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one specialty is required'),
  body('specialties.*')
    .optional()
    .isIn(['bridal', 'party', 'festival', 'corporate', 'traditional', 'modern', 'arabic', 'indian'])
    .withMessage('Invalid specialty'),
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience must be between 0 and 50 years'),
  body('pricing.basePrice')
    .optional()
    .isFloat({ min: 50 })
    .withMessage('Base price must be at least £50'),
  body('pricing.hourlyRate')
    .optional()
    .isFloat({ min: 20 })
    .withMessage('Hourly rate must be at least £20')
];

// Public routes
router.post('/register', authRateLimit, registerValidation, register);
router.post('/login', authRateLimit, loginValidation, login);
router.post('/forgotpassword', authRateLimit, forgotPasswordValidation, forgotPassword);
router.put('/resetpassword/:resettoken', authRateLimit, resetPasswordValidation, resetPassword);
router.get('/verify/:token', verifyEmail);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/logout', logout);
router.get('/me', getMe);
router.put('/updatedetails', updateDetailsValidation, updateDetails);
router.put('/updatepassword', updatePasswordValidation, updatePassword);
router.post('/resend-verification', resendVerification);
router.put('/deactivate', deactivateAccount);

// Artist-only routes
router.put('/artist-profile', authorize('artist'), artistProfileValidation, updateArtistProfile);

module.exports = router; 