import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { JsonWebToken } from "../services/TokenService.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});
const prisma = new PrismaClient()
export const createOrder = asyncHandler(async (req, res) => {
  try {
    
    const { name, mobile , tickets } = req.body;

    if (!name || !mobile) {
      throw new ApiError(400, "Name and Mobile are required");
    }

    // checking the ticket lengtha and calcuklating do v recieved arrya of object or not 

    if(!Array.isArray(tickets) || tickets.length==0){
      throw new ApiError(401,"Something went wrong")
    }

    const { requestedTickets } = req.body;
    const slotEntry = req.slotEntry;

let amount = 0 ;

tickets.forEach((ticket)=>{
const {army=false ,age } = ticket;

// there the ticket is noting but an array of object and now ill hvae every instance meaasn every object of ticket present inside it !! now lets ddo the magic 

if(army){
  amount += 50;
}else if(age <= 5){
  amount += 0;
}else if(age > 5 && age < 18){
  amount += 50
}else{
  amount += 100;
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
    }
        });

        if(!tempOrder) throw new ApiError(401,"order not foudn in db")
 
          const slotEntry = await prisma.slotAvailability.findFirst({
    where: {
      date: tempOrder.date,
      slot: tempOrder.slot,
    }
  });
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
            slot: tempOrder.slot
          }
        ]
      }
    }
  });



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

  // checking the phone number 
  // generating the 6 digit otp
  // generating the token on the payload of our number 
  // jwt new secret in env file 
  // send the cookies token in fomr of this  

  const{phoneNumber} = req.body;
  // if(phoneNumber.length<10 || phoneNumber.length>10) throw new ApiError(401,"something went wron")
  if(!phoneNumber) throw new ApiError(401, "Please enter your phone number") ;
  
  // --> generatingOtp()// logic will come here 

  const RouteTOken = await JsonWebToken.generateToken({phoneNumber});
  if(!RouteTOken) throw new ApiError(401, "something went wrong try again");

     const options = {
  httpOnly: true,         // Prevent JS access (XSS safe)
  secure: true,           // Only over HTTPS (set to false in dev if needed)
  sameSite: 'Lax',        // CSRF protection (or 'None' if cross-origin + secure)
  maxAge: 10*60*1000 // 10 mintues validity in milliseconds
};

return res.status(201).cookie("RouteToken" , RouteTOken,options).json(new APiResponse(201,{RouteTOken} , "all done here is your otpVerifcation token"))

})