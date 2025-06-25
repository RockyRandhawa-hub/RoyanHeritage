import { JsonWebToken } from "../services/TokenService";
import { ApiError } from "../utils/ApiError";
import { APiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";


const authProtectedRout = asyncHandler(async(req,res,next)=>{
try {
    
        const {RouteToken} = req.cookies.RouteToken;
    
        if(!RouteToken) throw new ApiError(401,"you are not verified plz verify your phone number again")
            
            const verfiedIsTrue = JsonWebToken.veriFyToken(RouteToken)
            if(!verfiedIsTrue) throw new ApiError(401, "something went wrong");
    
            const phoneNumber = JsonWebToken.decodeToken(RouteToken);
            req.phoneNumber = phoneNumber.phoneNumber;
    
        next();
} catch (error) {
    throw new ApiError(401, "something went wrong")
}
})