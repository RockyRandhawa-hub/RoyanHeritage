import express from 'express';
import { checkSlotAndLimit } from '../middlewares/requestedTicket.js';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';

const PaymentRoute = express.Router();

PaymentRoute.route("/createorder").post(checkSlotAndLimit, createOrder);

PaymentRoute.post("/verify", verifyPayment);


export { PaymentRoute };