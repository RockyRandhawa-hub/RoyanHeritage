import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { JsonWebToken } from "../services/TokenService.js";
import { json } from "stream/consumers";
import { tracingChannel } from "diagnostics_channel";

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

    console.log(requestedTickets == tickets.length);
    
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

        const tempTicketsData = tickets.map(t => ({
  name: t.name,
  age: t.age,
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
  // the upper slot entry is making code more reliable coz it will make suire for the same slot the itckets should not be pover booked !! this is handling the case 2 client initated payment together but one did fiisrst and the quota of 18 tickets gets filled sp once it is filled it is done !!
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

  if (!req.cookies?.GenerationOfOtpToken) {
    throw new ApiError(401, "Token missing or expired. Please try again.");
  }
  
  const token = req.cookies.GenerationOfOtpToken;

  if(!token) throw new ApiError(401, "Something went wrong try again give the phone number once again");

  const decodedOtp = JsonWebToken.decodeToken(token);

  if(!decodedOtp) throw new ApiError(401,"something went wrong")

  if(decodedOtp.otp !== otp) throw new ApiError(401,"wrong otp");

  return res.status(201).json(new APiResponse(201, decodedOtp.phoneNumber, "Otp verified"));
})

function GenerateSixDigitAndSendTwilio(){
  return "123456";
}

export const GenerateOtp = asyncHandler(async(req,res)=>{

  // geenrating token 
  // will take the phone Number 
  // will reutrn the token and otp based on the payload of the tokenn ok and the token will come in the fomrat of cookies 

  const{phoneNumber} = req.body;
  
  
if(phoneNumber.length !== 10){
  return res.status(401).json(new ApiError(401, "Please enter a valid 10-digit Indian mobile number"));
}

  // geenrating otp and

  const otp = GenerateSixDigitAndSendTwilio(); 

  const enrichedPayload = {otp  , phoneNumber}

  const GenrateTokenOtpandPhoneNumber = await JsonWebToken.generateToken(enrichedPayload)
  
  const options = {
  httpOnly: true,         // Prevent JS access (XSS safe)
  secure: true,           // Only over HTTPS (set to false in dev if needed)
  sameSite: 'Lax',        // CSRF protection (or 'None' if cross-origin + secure)
  maxAge: 10*60*1000 // 10 mintues validity in milliseconds
};

  return res.status(201).cookie("GenerationOfOtpToken" , GenrateTokenOtpandPhoneNumber,options).json(new APiResponse(201,GenrateTokenOtpandPhoneNumber ,"there u go ur otp"))




})