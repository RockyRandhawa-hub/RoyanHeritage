import { ApiError } from "./../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"
import { JsonWebToken } from "../services/TokenService.js";
const prisma  =new PrismaClient()


const generateAccessToken  =async (userId)=>{
    const user = await prisma.admin.findUnique({
        where:{
           id: userId
        }, 
        select:{
            email :true , 
            id : true
        }
    })

if (!user) throw new ApiError(401, "Admin not found");

        const token  = await JsonWebToken.generateToken({
            id:user.id , 
            email:user.email
        })

        if(!token)  throw new ApiError(501, "Something went wrong"); 
        return token;

}

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
            FirstName:true, 
            LastName:true
        }
    })

    
    if(!newuser) throw new ApiError(501, "someting went wrong")

        return res.status(201).json(new APiResponse(201 , dataToBeReturnedtoFrotnednSignUP , "user data is registered  scuessfully"))

}) 


const loginCOntroller = asyncHandler(async(req,res)=>{
  // take the id and password 
  // comapre the password via bacrypt 
  // if all is done send the token as cookie and also from the frontend side ok 

    const {email  ,password } = req.body; 

    if(!email || !password) throw new ApiError(401, "You need to signup");
 
    const AdminUserHashedPassword   = await prisma.admin.findUnique({
        where:{
            email
        },
        select:{
            password:true , 
            id: true
        }
    })
      if(!AdminUserHashedPassword) throw new ApiError(501, "something went wrong ");

      const adminID = AdminUserHashedPassword.id; 
      const checkingPassword = await bcrypt.compare(password , AdminUserHashedPassword.password)

      if(!checkingPassword) throw new ApiError(401, "hey the password is not done right")

        const token = await generateAccessToken (AdminUserHashedPassword.id); 
        if(!token) throw new ApiError(401, "Something went wrong")
        const loggedInUser = await prisma.admin.findUnique({
            where:{
                id:adminID
            },
            select:{
                   FirstName: true,
    LastName: true,
    email: true
            }
        })

      const options = {
  httpOnly: true,         // Prevent JS access (XSS safe)
  secure: true,           // Only over HTTPS (set to false in dev if needed)
  sameSite: 'Lax',        // CSRF protection (or 'None' if cross-origin + secure)
  maxAge: 24 * 60 * 60 * 1000 // 1 day validity in milliseconds
};

        return res.status(201).cookie("access" , token , options).json(new APiResponse(201,{user:loggedInUser , token}))
    
})

export{registerController , loginCOntroller}