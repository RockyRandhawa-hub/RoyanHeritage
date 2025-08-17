import express from 'express';
import { checkSlotAndLimit } from '../middlewares/requestedTicket.js';
import { 
  createCashfreeOrder,
  verifyCashfreePayment, 
} from '../controllers/paymentController.js';
import { authProtectedRout } from '../middlewares/Auth.js';

const PaymentRoute = express.Router();

PaymentRoute.route("/createorder").post(
  // authProtectedRout,       // 1st middleware - Authentication check
  checkSlotAndLimit,       // 2nd middleware - Slot availability check  
createCashfreeOrder
);

PaymentRoute.post("/verify", verifyCashfreePayment);

export { PaymentRoute };