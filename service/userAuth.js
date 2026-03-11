import jwt from "jsonwebtoken";

export const createToken = (user)=>{
    const token = jwt.sign({username : user.username},process.env.SECRET_KEY_USER);
    return token;
}

export const userAuthMiddleware = async (req,res,next)=>{
    // take token from authorization header
    if(!req.headers.authorization){
        return res.status(404).json({message : "Authorization header not found"});
    }
    let token = req.headers.authorization.split(" ")[1];

    if(!token){
        return res.status(404).json({message : "Token not found"});
    }
    
    try {
        let {username} = jwt.verify(token,process.env.SECRET_KEY_USER);
        req.username = username;
        next();
    } catch(err) {
        return res.status(404).json({message : "Invalid token"});
    }
}