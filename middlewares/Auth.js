import { JsonWebToken } from "../services/TokenService.js";
import { ApiError } from "../utils/ApiError.js";
import { APiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


export const authProtectedRout = asyncHandler(async(req,res,next)=>{
    


try {
    
        const RouteToken = req.cookies.RouteToken;
    
        if(!RouteToken) throw new ApiError(401,"you are not verified plz verify your phone number again")
            
            const verifiedPayload  = JsonWebToken.veriFyToken(RouteToken)
            if(!verifiedPayload ) throw new ApiError(401, "something went wrong");
    
            req.phoneNumber = verifiedPayload.phoneNumber;
                next();    
} catch (error) {
    throw new ApiError(401, "something went wrong")
 }
})