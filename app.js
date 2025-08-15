import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from './routes/PaymentRoute.js';
import { otpVerificationRouter } from './routes/otpVerification.js';
import { redisClient } from './controllers/paymentController.js';    // ⚠️ Make sure it's NOT imported from a controller

// ✅ Fixed import for connect-redis using createRequire for compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const connectRedis = require('connect-redis');

const app = express();

// ✅ Create RedisStore after importing session
const RedisStore = connectRedis(session);

// ✅ Required to make secure cookies work behind Render/Vercel proxies
app.set('trust proxy', 1);

// ✅ Cookie parser first
app.use(cookieParser());

// ✅ Session middleware with corrected RedisStore initialization
app.use(session({
  store: new RedisStore({ 
    client: redisClient,
    prefix: "myapp:", // Optional: prefix for Redis keys
  }),
  secret: 'your-strong-random-secret', // Store in .env
  resave: false,
  saveUninitialized: true,  // ✅ Changed to true to ensure session creation
  name: 'sessionId', // ✅ Custom session name
  cookie: {
    secure: true,           // ✅ Always true in production (Render uses HTTPS)
    httpOnly: true,         // Not accessible via JS
    sameSite: 'None',       // ✅ Required for cross-site cookies in production
    maxAge: 10 * 60 * 1000, // 10 minutes
  }
}));

console.log(`🟢 Server init...`);

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://reactpractce-rep.vercel.app",
    "https://final-frontendrthing.vercel.app",
    "https://www.theheritagewalk.in",
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ✅ Routes
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/payment", PaymentRoute);
app.use("/api/v1/verify", otpVerificationRouter);

export { app };