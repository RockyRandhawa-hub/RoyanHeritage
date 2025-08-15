import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from './routes/PaymentRoute.js';
import { otpVerificationRouter } from './routes/otpVerification.js';
import { redisClient } from './controllers/paymentController.js';
import { RedisStore } from 'connect-redis';

const app = express();

// ✅ Trust proxy for deployment platforms
app.set('trust proxy', 1);

// ✅ CORS must be configured BEFORE session middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://reactpractce-rep.vercel.app",
    "https://final-frontendrthing.vercel.app",
    "https://www.theheritagewalk.in",
  ],
  credentials: true  // This is crucial for sessions to work
}));

// ✅ Body parsers before session
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Session middleware configuration
app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: "myapp:",
  }),
  secret: process.env.SESSION_SECRET || 'your-strong-random-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Custom session cookie name
  cookie: {
    secure: true, // Only HTTPS in production
    httpOnly: true,        // Prevent XSS attacks
    sameSite: 'None',      // Changed from 'Lax' to lowercase
    maxAge: 10 * 60 * 1000  // 10 minutes
  }
}));

app.use(express.static("public"));

console.log(`🟢 Server init...`);

// ✅ Routes
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/payment", PaymentRoute);
app.use("/api/v1/verify", otpVerificationRouter);

export { app };