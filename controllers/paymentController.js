import Razorpay from "razorpay";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
});

export const createOrder = asyncHandler(async (req, res) => {
  try {
    const { name, mobile } = req.body;

    if (!name || !mobile) {
      throw new ApiError(400, "Name and Mobile are required");
    }

    const { requestedTickets } = req.body;
    const slotEntry = req.slotEntry;

    const amount = requestedTickets * 50 * 100; // paisa

    const razorpayOrder = await razorpayInstance.orders.create({
      amount,
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

    return res.status(200).json(
      new APiResponse(200, {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.RAZORPAY_KEY_ID,
      }, "Order created successfully")
    );
  } catch (error) {
    console.error("Razorpay Order Error: ", error);
    return res
      .status(501)
      .json(new ApiError(501, "Something went wrong while creating order"));
  }
});
