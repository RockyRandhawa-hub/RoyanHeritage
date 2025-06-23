import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';
import { PaymentRoute } from './routes/paymentRoute.js';  // path must be correct

const app = express() ;

app.use(cors({
origin: "http://localhost:5173",
    credentials:true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))

app.use("/api/v1/admin" , adminRouter);
app.use("/api/v1/payment" , PaymentRoute)

export{app}