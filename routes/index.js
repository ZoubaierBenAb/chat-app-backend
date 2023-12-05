import express from 'express'
import authRoute from './auth.js'; 
import userRoute from './user.js';

const router = express.Router()


router.use('/auth',authRoute)
router.use('/users',userRoute)


export default router

// combining the auth and user outes in the index.js file 