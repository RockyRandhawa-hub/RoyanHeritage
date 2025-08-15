import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { JsonWebToken } from "../services/TokenService.js";
import { json } from "stream/consumers";
import { tracingChannel } from "diagnostics_channel";
import { log } from "console";
import { sendEmail } from "../utils/mailsender.js";

import { createClient } from 'redis';
import session from "express-session";
const prisma = new PrismaClient()


const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

console.log(process.env.REDIS_URL);


export const redisClient= createClient({
  url: process.env.REDIS_URL,
 token:"AbAbAAIncDFmZWU3ZTE1Y2E2Mzc0ZDI0OWJkYWEwNDYxN2ViNmRmNHAxNDUwODM"
})

redisClient.on('error', (err)=> console.log(` ${err} ,  something went wrong redis error it is `))

await redisClient.connect();

console.log(`redis connection established`);


export const createOrder = asyncHandler(async (req, res) => {
  try {
    
    const {  tickets } = req.body;

    const name = tickets[0]["name"]

    const mobile = tickets[0]["phone"]
    console.log(name , mobile);
    

    if (!name || !mobile) {
      throw new ApiError(400, "Name and Mobile are required");
    }

    // checking the ticket lengtha and calcuklating do v recieved arrya of object or not 

    if(!Array.isArray(tickets) || tickets.length==0){
      throw new ApiError(401,"Something went wrong")
    }

    const { requestedTickets } = tickets.length;
    const slotEntry = req.slotEntry;

    
let amount = 0 ;

tickets.forEach((ticket)=>{
const {army=false ,age } = ticket;

// there the ticket is noting but an array of object and now ill hvae every instance meaasn every object of ticket present inside it !! now lets ddo the magic 
if(army){
  amount += 100;
}else if(age <= 5){
  amount += 0;
}else if(age > 5 && age < 18){
  amount += 100
}else if(age>59){
  amount += 100
}
else{
  amount += 200;
}

})

const totalAmount = amount * 100;
const totalTicketCount = tickets.length;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount : totalAmount,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        name,
        mobile,
        slot: slotEntry.slot,
        date: slotEntry.date.toISOString(),
        requestedTickets,
      },
    });
  
    

     const tempOrder =  await prisma.tempOrder.create({
        data:{
   razorpayOrderId: razorpayOrder.id,
    name,
    mobile,
    slot: slotEntry.slot,
    date: slotEntry.date,
    requestedTickets: tickets.length
        }
      })

      if(!tempOrder) throw new ApiError(501, "try again something went wrong")

        const tempTicketsData = tickets.map(t => ({
  name: t.name,
  age: Number(t.age),
  army: t.army || false,
  tempOrderId: tempOrder.id
}));

await prisma.tempTicket.createMany({
  data: tempTicketsData
});

    return res.status(200).json(
      new APiResponse(200, {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
        tempOrder
      }, "Order created successfully")
    );
  } catch (error) {
    console.error("Razorpay Order Error: ", error);
    return res
      .status(501)
      .json(new ApiError(501, "Something went wrong while creating order"));
  }
});





export const verifyPayment = asyncHandler(async(req,res)=>{
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, "Missing required payment verification fields");
  }

  
  const generated_signature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
    
    if (generated_signature === razorpay_signature) {
    // You can optionally store payment info to DB here
        const tempOrder = await prisma.tempOrder.findUnique({
          where: {
      razorpayOrderId: razorpay_order_id
    },
    include:{
      tempTickets: true
    }
        });

        if(!tempOrder) throw new ApiError(401,"order not foudn in db")
 
   const slotEntry = await prisma.slotAvailability.findFirst({
    where: {
      date: tempOrder.date,
      slot: tempOrder.slot,
    }
  });
  // the upper slot entry is making code more reliable coz it will make suire for the same slot the tickkets should not be pover booked !! this is handling the case 2 client initated payment together but one did fiisrst and the quota of 18 tickets gets filled sp once it is filled it is done !!
 if (!slotEntry) {
    throw new ApiError(404, "Slot not found");
  }


   if (slotEntry.remaining < tempOrder.requestedTickets) {
    throw new ApiError(400, "Not enough tickets remaining");
  }

  

     await prisma.slotAvailability.update({
    where: { id: slotEntry.id },
    data: {
      remaining: slotEntry.remaining - tempOrder.requestedTickets
    },
    select:{
      remaining:true
    }
  });
  
  const visitor = await prisma.visitor.create({
    data: {
      name: tempOrder.name,
      mobile: tempOrder.mobile,
      tickets: {
        create: [
          {
            quantity: tempOrder.requestedTickets,
            date: tempOrder.date,
            slot: tempOrder.slot,
            persons: {
              create: tempOrder.tempTickets.map(ticket => ({
                name: ticket.name,
                age: ticket.age,
                army: ticket.army,
              })),
            },
          },
        ],
      },
    },
    include: {
      tickets: {
        include: {
          persons: true,
        },
      },
    },
  });
  
  // deletting so that the db doesnt get pouplated 
  await prisma.tempTicket.deleteMany({ where: { tempOrderId: tempOrder.id } });
  await prisma.tempOrder.delete({ where: { id: tempOrder.id } });

const enrichedVisitor = {
  ...visitor , 
requestedTicketInfo : `Total number of requested tickets you asked for is ${tempOrder.requestedTickets}`
}
return res.status(200).json(
      new APiResponse(
        200,
        {
          razorpay_order_id,
          razorpay_payment_id,
          visitor : enrichedVisitor,
          
        },
        "Payment verified successfully"
      )
    );
  } else {
    throw new ApiError(400, "Payment verification failed");
  }

})

export const otpVerification = asyncHandler(async(req,res)=>{

  const {otp} = req.body; 

  // Check if cookie exists (for frontend protected routes)
  if (!req.cookies?.GenerationOfEmailToken) {
    throw new ApiError(401, "Token missing or expired. Please try again.");
  }
  
  // Get email from session (stored during OTP generation)
  const email = req?.session?.email;
  console.log(email);
  
  // if(!email) {
  //   throw new ApiError(401, "Session expired. Please generate OTP again.");
  // }

  // Get stored OTP from Redis
  const storedOtp = await redisClient.get(email);
  console.log(storedOtp, "hey this is something crazy good");
  

  if(!storedOtp) {
    throw new ApiError(401, "OTP expired or not found. Please generate a new OTP.");
  }

  // Compare provided OTP with stored OTP
  if(storedOtp !== otp) {
    throw new ApiError(401, "Invalid OTP. Please try again.");
  }

  // OTP verified successfully, clean up Redis
  await redisClient.del(email);

  return res.status(201).json(new APiResponse(201, {email}, "OTP verified successfully"));
});


function GenerateAndSendSixDigitEmail(){
    return Math.floor(100000 + Math.random() * 900000).toString();

}

export const GenerateOtp = asyncHandler(async(req,res)=>{

  const{email} = req.body;
  
  if(!email ){
    return res.status(401).json(new ApiError(401, "Please enter a valid email Id"));
  }

  // generating otp
  const otp = GenerateAndSendSixDigitEmail(); 

  const emailHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 500px; margin: auto; background: #f4f4f4; padding: 30px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.15);">
      <div style="background-color: #1e1e2f; padding: 20px; border-radius: 10px 10px 0 0; color: white; text-align: center;">
        <h2 style="margin: 0; font-size: 24px;">🚀 OTP Verification</h2>
      </div>
      <div style="background: #ffffff; padding: 20px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Hello 👋</p>
        <p style="font-size: 16px; color: #333;">Thanks for connecting with us. Please use the following One-Time Password (OTP) to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <span style="display: inline-block; background-color: #1e1e2f; color: white; font-size: 30px; letter-spacing: 5px; padding: 15px 30px; border-radius: 8px; font-weight: bold;">
            ${otp}
          </span>
        </div>

        <p style="font-size: 14px; color: #777;">This OTP is valid for the next <strong>10 minutes</strong>. Do not share it with anyone.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />

        <p style="font-size: 12px; color: #999; text-align: center;">
          If you didn't request this, you can safely ignore this email.<br />
          — Team MCME 🔐
        </p>
      </div>
    </div>
  `;
  
  await sendEmail(email, "Your OTP Code", emailHTML);

  // Store email in session for later verification
  req.session.email = email;

console.log(req.session.email , "hey there this is something newww neww nww");

  // Store OTP in Redis with email as key, expires in 10 minutes (600 seconds)
  await redisClient.setEx(email, 600, otp);

  // Generate token for cookie (keeping same cookie name for frontend)
  const GenrateTokenOtpandPhoneNumber = await JsonWebToken.generateToken({email});
  
  const options = {
    httpOnly: true,         // Prevent JS access (XSS safe)
    secure: true,  // Only over HTTPS in production
    sameSite: 'None',        // CSRF protection
    maxAge: 10*60*1000      // 10 minutes validity in milliseconds
  };

  return res.status(201)
    .cookie("GenerationOfEmailToken", GenrateTokenOtpandPhoneNumber, options)
    .json(new APiResponse(201, GenrateTokenOtpandPhoneNumber, "OTP sent successfully"));
});
