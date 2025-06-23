import express from 'express';
import { checkSlotAndLimit } from '../middlewares/requestedTicket.js';
import { createOrder } from '../controllers/paymentController.js';

const PaymentRoute = express.Router();

PaymentRoute.route("/createorder").post(checkSlotAndLimit, createOrder);

export { PaymentRoute };