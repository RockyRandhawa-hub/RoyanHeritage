import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import NodeCache from "node-cache";

import { Prisma, PrismaClient } from "@prisma/client";
import { JsonWebToken } from "../services/TokenService.js";
import { json } from "stream/consumers";
import { tracingChannel } from "diagnostics_channel";
import { log } from "console";
import { sendEmail } from "../utils/mailsender.js";
import axios from 'axios'
import { createClient } from 'redis';
import session from "express-session";
const prisma = new PrismaClient()


// const razorpayInstance = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_SECRET,
// });

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg"; // use prod url in live

const otpCache = new NodeCache({ stdTTL: 600 }); // 10 mins TTL


console.log('🔑 DEBUG: Environment variables loaded:');
console.log('CASHFREE_APP_ID:', process.env.CASHFREE_APP_ID);
console.log('CASHFREE_SECRET_KEY:', process.env.CASHFREE_SECRET_KEY ? 'EXISTS' : 'MISSING');
console.log('CASHFREE_SECRET_KEY (first 20 chars):', process.env.CASHFREE_SECRET_KEY?.substring(0, 20));



export const createCashfreeOrder = asyncHandler(async (req, res) => {
  const { tickets } = req.body;
  console.log("there u go ur data ciming from frontend" , tickets);
  

   let totalAmount = 0; // initialization!

  tickets.forEach((ticket) => {
    const age = parseInt(ticket.age) || 0;
    
    if (ticket.army) {
      totalAmount += 100; // Army personnel: ₹100
    } else if (age >= 18 && age < 60) {
      totalAmount += 200; // Adults (18-59): ₹200
    } else if (age < 5) {
      totalAmount += 0;   // Children under 5: Free
    } else if (age < 18) {
      totalAmount += 100; // Children (5-17): ₹100
    } else if (age >= 60) {
      // 🔧 FIX 2: Handle seniors (60+) - you missed this case!
      totalAmount += 100; // Assuming seniors get discount like army
    }
  });

  console.log(`💰 Total calculated amount: ₹${totalAmount} for ${tickets.length} tickets`);
  
  // 🔧 FIX 3: Add validation for zero amount
  if (totalAmount <= 0) {
    throw new ApiError(400, "Invalid total amount calculated");
  }
  // Calculate total amount
  // const totalAmount = tickets.length * 50;
  
  // Generate unique order ID
  const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const orderPayload = {
    order_id: orderId,
    order_amount: totalAmount,
    order_currency: "INR",
    customer_details: {
      customer_id: `customer_${Date.now()}`,
      customer_name: tickets[0].name,
      customer_email: tickets[0].email,
      customer_phone: tickets[0].phone
    },
    order_meta: {
        return_url: "https://www.theheritagewalk.in/EnterEmail/BookingDetails/BookingForm?payment=success&order_id={order_id}",
      payment_methods: "cc,dc,upi,nb"
    },
    order_note: `Heritage Walk booking for ${tickets.length} tickets`
  };

  try {
    // Validate slot availability before creating order
    const dateTime = new Date(tickets[0].date);
    
    const slotEntry = await prisma.slotAvailability.findFirst({
      where: {
        date: {
          gte: new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate()),
          lt: new Date(dateTime.getFullYear(), dateTime.getMonth(), dateTime.getDate() + 1)
        },
        slot: tickets[0].slot,
      }
    });

    if (!slotEntry) {
      throw new ApiError(404, "Slot not available for the selected date");
    }

    if (slotEntry.remaining < tickets.length) {
      throw new ApiError(400, `Only ${slotEntry.remaining} tickets remaining for this slot`);
    }

    // 🔧 FIX: Use PRODUCTION URL
    const response = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': CASHFREE_APP_ID,
        'X-Client-Secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      },
      body: JSON.stringify(orderPayload)
    });

    const orderData = await response.json();
    
    if (!response.ok) {
      console.error('Cashfree API Error:', orderData);
      throw new ApiError(400, `Order creation failed: ${orderData.message || 'Unknown error'}`);
    }

    // Save to database with normalized date
    const tempOrder = await prisma.tempOrder.create({
      data: {
        cashfreeOrderId: orderId,
        name: tickets[0].name,
        mobile: tickets[0].phone,
        date: dateTime,
        slot: tickets[0].slot,
        requestedTickets: tickets.length,
        tempTickets: {
          create: tickets.map(ticket => ({
            name: ticket.name,
            age: parseInt(ticket.age) || 0,
            army: ticket.army === 'true' || ticket.army === true,
          }))
        }
      }
    });

    res.status(201).json(
      new APiResponse(
        201,
        {
          orderId: orderData.order_id,
          payment_session_id: orderData.payment_session_id,
          order_status: orderData.order_status,
          amount: totalAmount,
          currency: "INR"
        },
        "Order created successfully"
      )
    );

  } catch (error) {
    console.error('Order creation error:', error);
    
    if (error.code === 'P2002') {
      throw new ApiError(400, "Duplicate order - please try again");
    } else if (error.name === 'PrismaClientValidationError') {
      throw new ApiError(400, `Data validation error: ${error.message}`);
    } else {
      throw new ApiError(error.statuscode || 500, error.message || `Failed to create order: ${error.message}`);
    }
  }
});



export const verifyCashfreePayment = asyncHandler(async(req, res) => {
  const { orderId } = req.body;
  
  if (!orderId) {
    throw new ApiError(400, "Missing required orderId for payment verification");
  }

  try {
    // 🔧 FIX: Use PRODUCTION URL for verification
    const cashfreeResponse = await fetch(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'X-Client-Id': CASHFREE_APP_ID,
        'X-Client-Secret': CASHFREE_SECRET_KEY,
        'x-api-version': '2023-08-01'
      }
    });

    const orderData = await cashfreeResponse.json();
    console.log('Cashfree order status:', orderData);

    if (orderData.order_status !== 'PAID') {
      throw new ApiError(400, `Payment not completed. Status: ${orderData.order_status}`);
    }

    // Find the temp order
    const tempOrder = await prisma.tempOrder.findUnique({
      where: {
        cashfreeOrderId: orderId
      },
      include: {
        tempTickets: true
      }
    });

    if (!tempOrder) {
      throw new ApiError(404, "Order not found in database");
    }

    // Improved date matching for slot lookup
    const orderDate = new Date(tempOrder.date);
    
    console.log('Looking for slot with:', {
      date: orderDate.toISOString(),
      slot: tempOrder.slot,
      dateOnly: orderDate.toDateString()
    });

    const slotEntry = await prisma.slotAvailability.findFirst({
      where: {
        date: {
          gte: new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()),
          lt: new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate() + 1)
        },
        slot: tempOrder.slot,
      }
    });

    console.log('Found slot entry:', slotEntry);

    if (!slotEntry) {
      console.error('Slot lookup failed:', {
        searchDate: orderDate,
        searchSlot: tempOrder.slot,
        tempOrderData: tempOrder
      });
      
      const availableSlotsForDate = await prisma.slotAvailability.findMany({
        where: {
          date: {
            gte: new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate()),
            lt: new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate() + 1)
          }
        }
      });
      
      console.log('Available slots for date:', availableSlotsForDate);
      throw new ApiError(404, `Slot "${tempOrder.slot}" not found for date ${orderDate.toDateString()}`);
    }

    if (slotEntry.remaining < tempOrder.requestedTickets) {
      throw new ApiError(400, `Not enough tickets remaining. Available: ${slotEntry.remaining}, Requested: ${tempOrder.requestedTickets}`);
    }

    // Update slot availability
    await prisma.slotAvailability.update({
      where: { id: slotEntry.id },
      data: {
        remaining: slotEntry.remaining - tempOrder.requestedTickets
      }
    });

    // Create visitor and tickets
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

    // Clean up temp data
    await prisma.tempTicket.deleteMany({ where: { tempOrderId: tempOrder.id } });
    await prisma.tempOrder.delete({ where: { id: tempOrder.id } });

    const enrichedVisitor = {
      ...visitor,
      requestedTicketInfo: `Total number of requested tickets you asked for is ${tempOrder.requestedTickets}`
    };

    return res.status(200).json(
      new APiResponse(
        200,
        {
          orderId: orderData.cf_order_id || orderData.order_id,
          paymentId: orderData.order_id,
          visitor: enrichedVisitor,
          amount: orderData.order_amount,
          currency: orderData.order_currency
        },
        "Payment verified successfully"
      )
    );

  } catch (error) {
    console.error('Cashfree verification error:', error);
    throw new ApiError(error.statuscode || 500, `Payment verification failed: ${error.message}`);
  }
});


export const otpVerification = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(401).json({ message: "Email and OTP required" });
  }

  const storedOtp = otpCache.get(email);

  if (!storedOtp) {
    return res.status(401).json({ message: "OTP expired or not found" });
  }

  if (storedOtp !== otp) {
    return res.status(401).json({ message: "Wrong OTP" });
  }

  // OTP matched, delete from cache
  otpCache.del(email);

  return res.status(201).json(new APiResponse(201, { email }, "OTP verified successfully"));
});


function GenerateAndSendSixDigitEmail(){
    return Math.floor(100000 + Math.random() * 900000).toString();

}


export const GenerateOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(401).json(new ApiError(401, "Please enter a valid email Id"));
  }

  // Generate OTP
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
          — Team MCMM 🔐
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail(email, "Your OTP Code", emailHTML);
  } catch (error) {
    console.error("Email sending error:", error);
    throw new ApiError(500, "Failed to send OTP email. Please try again.");
  }

  // 🔑 Store OTP in node-cache with 10 min TTL
  otpCache.set(email, otp);

  // 🔑 Still generate token for cookie (keep your flow intact)
  const GenrateTokenOtpandPhoneNumber = await JsonWebToken.generateToken({ email });

  const options = {
    httpOnly: true,
    secure: false,   // ⚠️ change to true in production if using HTTPS
    sameSite: "lax",
    maxAge: 10 * 60 * 1000, // 10 mins
  };

  return res
    .status(201)
    .cookie("GenerationOfEmailToken", GenrateTokenOtpandPhoneNumber, options)
    .json(new APiResponse(201, { email }, "OTP sent successfully"));
});


