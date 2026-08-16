import jwt from "jsonwebtoken";
import { ApiResponse } from "../utils/ApiResponse.js";

export const createToken = (dev)=>{
    const token = jwt.sign({username : dev.username},process.env.SECRET_KEY_DEVELOPER);
    return token;
}

export const devAuthMiddleware = async (req,res,next)=>{
    if( !req.headers.authorization ){
        return ApiResponse.error(res, 401, "Authorization header not found");
    }
    let token = req.headers.authorization.split(" ")[1];
    if( !token ){
        return ApiResponse.error(res, 401, "Token not found");
    }

    try {
        let {username} = jwt.verify(token,process.env.SECRET_KEY_DEVELOPER);
        req.username = username;
        next();
    } catch(err) {
        return ApiResponse.error(res, 401, "Invalid token", err.message);
    }
}