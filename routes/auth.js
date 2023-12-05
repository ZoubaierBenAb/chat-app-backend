import express from 'express'
import { forgotPassword, login, register, resetPassword, sendOTP, verifyOtp } from '../controllers/auth.js'


const router = express.Router()

router.post('/login',login)

router.post('/register',register,sendOTP)
router.post('/verify-otp',verifyOtp)
router.post('/send-otp',sendOTP)

router.post('/forgot-password',forgotPassword)
router.post('/reset-password',resetPassword)

export default router