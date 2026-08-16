import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createToken = (user)=>{
    const token = jwt.sign({username : user.username},process.env.SECRET_KEY_USER);
    return token;
}

export const userAuthMiddleware = async (req,res,next)=>{
    // take token from authorization header
    if(!req.headers.authorization){
        return ApiResponse.error(res, 401, "Authorization header not found");
    }
    let token = req.headers.authorization.split(" ")[1];

    if(!token){
        return ApiResponse.error(res, 401, "Token not found");
    }
    
    try {
        let {username} = jwt.verify(token,process.env.SECRET_KEY_USER);
        req.username = username;
        next();
    } catch(err) {
        return ApiResponse.error(res, 401, "Invalid token", err.message);
    }
}