import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';
import RedisStore from 'connect-redis';

import { PaymentRoute } from    './routes/PaymentRoute.js'  // ath must be correct
import { otpVerificationRouter } from './routes/otpVerification.js';
import session from 'express-session';
import { redisClient } from './controllers/paymentController.js';

const app = express() ;
app.use(cookieParser())
    
app.set('trust proxy', 1); // 🔥 Required on Render for secure cookies

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'your-strong-random-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,           // 🔒 Only over HTTPS
    httpOnly: true,         // 🔒 Protect from XSS
    sameSite: 'None',       // ✅ Needed for cross-site cookies (e.g., frontend on different domain)
    maxAge: 10 * 60 * 1000  // 10 minutes
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
