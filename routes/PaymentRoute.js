import express from 'express';
import { checkSlotAndLimit } from '../middlewares/requestedTicket.js';
import { createOrder, verifyPayment } from '../controllers/paymentController.js';
import { authProtectedRout } from '../middlewares/Auth.js';

const PaymentRoute = express.Router();

PaymentRoute.route("/createorder").post(authProtectedRout,checkSlotAndLimit,createOrder);

PaymentRoute.post("/verify", verifyPayment);


export { PaymentRoute };

// checkSlotAndLimit  --> 1 st one
//createOrder --> 2nd one
// 