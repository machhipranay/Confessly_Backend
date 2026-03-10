import jwt from "jsonwebtoken";

export const createToken = (dev)=>{
    const token = jwt.sign({username : dev.username},process.env.SECRET_KEY_DEVELOPER);
    return token;
}

export const devAuthMiddleware = async (req,res,next)=>{
    let token = req.header.token;
    if(!token){
        return res.status(404).json({message : "Token not found"});
    }
    try {
        let {username} = jwt.verify(token,process.env.SECRET_KEY_DEVELOPER);
        req.username = username;
        next();
    } catch(err) {
        return res.status(404).json({message : "Invalid token"});
    }
}