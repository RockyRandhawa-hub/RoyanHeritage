import express from 'express'
import { GenerateOtp,  otpVerification } from '../controllers/paymentController.js';

const otpVerificationRouter = express.Router(); 

// otpVerificationRouter.route("/verifyOtp").get("<h1>hey there </h1>")

otpVerificationRouter.route("/generateOtp").post(GenerateOtp)

otpVerificationRouter.route("/verifyOtp").post(otpVerification)

export {otpVerificationRouter}


