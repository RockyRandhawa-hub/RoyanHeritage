import { ApiError } from "./../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"
const prisma  =new PrismaClient()

const registerController = asyncHandler(async(req,res)=>{

    // check the email and password
    //check is the use exist before this !?
    // if all thing is good save the user in out dataBase
console.log("REQ BODY ===> ", req.body); // should print actual data

    const {email , password ,LastName , FirstName}  =req.body; 
    console.log("BODY AYA? ->", req.body);

    if(
        [email, password].some((field)=>field.trim() === "")
    ){
        throw new ApiError(401,"all fields are required")
    }

    const existingUser = await prisma.admin.findUnique({
        where:{
            email
        }
    })
    
    if(existingUser){
        throw new ApiError(401 , "The email is already in used")
    }

    const hashedPassword = await bcrypt.hash(password , 10)

    const newuser = await prisma.admin.create({
        data:{
            email , password:hashedPassword ,LastName , FirstName
        }
    })
    
    const dataToBeReturnedtoFrotnednSignUP = await prisma.admin.findUnique({
        where:{
            email:newuser.email
        },
        select:{
            id:true,
            email:true,
            password:false,
            FirstName:true, 
            LastName:true
        }
    })

    
    if(!newuser) throw new ApiError(501, "someting went wrong")

        return res.status(201).json(new APiResponse(201 , dataToBeReturnedtoFrotnednSignUP , "user data is registered  scuessfully"))

}) 




export{registerController}