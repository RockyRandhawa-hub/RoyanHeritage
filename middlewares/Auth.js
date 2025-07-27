import { JsonWebToken } from "../services/TokenService.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authProtectedRout = asyncHandler(async(req, res, next) => {
    try {
        const RouteToken = req.cookies?.GenerationOfEmailToken;
        console.log(`route token is there`);
        
        if(!RouteToken) {
            throw new ApiError(401, "you are not verified plz verify your phone number again");
        }
        
        console.log(`route token is verified`);
        
        const verifiedPayload = JsonWebToken.veriFyToken(RouteToken);
        console.log(verifiedPayload, "the payload is there");

        if(!verifiedPayload) {
            throw new ApiError(401, "Invalid or expired token");
        }

        req.email = verifiedPayload.email;
        console.log(`everything seems working`);
        
        next();    
    } catch (error) {
        console.error('Auth middleware error:', error);
        
        // Don't throw a generic error, let the original error propagate
        if (error instanceof ApiError) {
            throw error;
        } else {
            throw new ApiError(401, `Authentication failed: ${error.message}`);
        }
    }
});