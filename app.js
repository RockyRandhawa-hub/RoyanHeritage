import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from    './routes/PaymentRoute.js'  // ath must be correct
import { otpVerificationRouter } from './routes/otpVerification.js';

const app = express() ;
app.use(cookieParser())
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://reactpractce-rep.vercel.app",
    "https://final-frontendrthing.vercel.app",
    "https://www.theheritagewalk.in",
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))

app.use("/api/v1/admin" , adminRouter);
app.use("/api/v1/payment" , PaymentRoute)
app.use("/api/v1/verify" , otpVerificationRouter)
export{app}
