import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { adminRouter } from './routes/adminRoutes.js';

const app = express() ;

app.use(cors({
    origin: ['http://localhost:3000'] ,
    credentials:true
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"))

app.use("/api/v1/admin" , adminRouter);


export{app}