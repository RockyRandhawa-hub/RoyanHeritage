import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from    './routes/PaymentRoute.js'  // ath must be correct
import { otpVerificationRouter } from './routes/otpVerification.js';
import session from 'express-session';

const app = express() ;
app.use(cookieParser())
    
app.use(session({
  secret: 'qwerty@1234', // Change this to a random string
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, // Set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000, // 24 hours,
    httpOnly:true,
    sameSite: 'None',


  }
}));



console.log(`hey there`);

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
