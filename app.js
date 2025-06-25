import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from './routes/paymentRoute.js';  // path must be correct
import { otpVerificationRouter } from './routes/otpVerification.js';

const app = express() ;
app.use(cookieParser())
app.use(cors({
origin: "http://localhost:5173",
    credentials:true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))

app.use("/api/v1/admin" , adminRouter);
app.use("/api/v1/payment" , PaymentRoute)
app.use("/api/v1/verify" , otpVerificationRouter)
export{app}