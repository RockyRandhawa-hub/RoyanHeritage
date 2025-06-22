import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {app} from './app.js'

dotenv.config({path:'./env'})


const prisma  = new PrismaClient(); 

prisma.$connect()
.then(()=>{
    console.log(`'🟢 PostgreSQL connected using Prisma`);
    app.listen(process.env.PORT||8080 , ()=>{
        console.log(`server started at:${process.env.PORT}`);
        
    })
    
}).catch((err)=>{
    console.error('🔴 Prisma connection error:', err);
    
})