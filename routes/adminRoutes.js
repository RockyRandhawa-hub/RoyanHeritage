import express from 'express';
import { registerController } from '../controllers/AdminController.js';

const adminRouter = express.Router(); 

adminRouter.route("/registeruser").post(registerController);

export { adminRouter };
