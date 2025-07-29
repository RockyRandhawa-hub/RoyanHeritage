import express from 'express';
import { AdminPannelController, loginCOntroller, registerController } from '../controllers/AdminController.js';

const adminRouter = express.Router(); 

adminRouter.route("/registeruser").post(registerController);

adminRouter.route("/getTheData").get(AdminPannelController);

adminRouter.route("/loginAdmin").post(loginCOntroller);

export { adminRouter };
