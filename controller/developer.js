import { Developer } from "../models/Developer.js";
import { createToken } from "../service/devAuth.js";
import { compareInput, hashInput } from "../utils/bcrypt.js";
import { devValidation } from "../validation/devValidation.js";

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Signup (Internal / Maintenance)
 * URL         : /dev/signup
 * METHOD TYPE : POST
 * AUTH        : Public
 * 
 * DESCRIPTION : Registers a new developer account into the system. Validates input
 *               payload using devValidation Joi schema and hashes password before saving.
 * 
 * DATA REQUIRED:
 *   - Body (JSON):
 *       - username (string) [Required] : Lowercase letters only
 *       - password (string) [Required] : Min 6 characters, at least 1 uppercase letter, 1 number, and 1 special character
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New Developer Added" }
 *   - 404 Not Found    : { message: "Developer already exists" | "Error Occured while adding developer!!!" | validation error }
 * -----------------------------------------------------------------------------
 */
export const signupDeveloper = async (req, res) => {
  const payload = {
    username : req.body.username,
    password : req.body.password
  }
  let { error } = devValidation.validate(payload);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }

  let developer = await Developer.findOne({username : req.body.username}).select("-password");
  if (developer) {
    return res.status(404).json({ message: "Developer already exists" });
  }

  payload.password = await hashInput(req.body.password);

  developer = new Developer(payload);
  await developer
    .save()
    .then(() => {
      return res.status(200).json({ message: "New Developer Added" });
    })
    .catch((err) => {
      return res
        .status(404)
        .json({ message: "Error Occured while adding developer!!!", error : err});
    });
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Login
 * URL         : /dev/login
 * METHOD TYPE : POST
 * AUTH        : Public
 * 
 * DESCRIPTION : Authenticates developer credentials (username & password) and 
 *               returns a JWT authorization token.
 * 
 * DATA REQUIRED:
 *   - Body (JSON):
 *       - username (string) [Required] : Registered developer username
 *       - password (string) [Required] : Developer password
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Login Successful As Developer", token: "<jwt_token>" }
 *   - 404 Not Found    : { message: "Username is incorrect" | "Password is incorrect" | "Some error occured!!!" }
 * -----------------------------------------------------------------------------
 */
export const loginDeveloper = async (req,res)=>{
  try {
    let developer = await Developer.findOne({username : req.body.username});
    if(developer){
      if(compareInput(req.body.password,developer.password)){
        let token = createToken({username : developer.username});
        return res.status(200).json({message : "Login Successful As Developer", token });
      }
      return res.status(404).json({message : "Password is incorrect"});
    } else {
      return res.status(404).json({ message: "Username is incorrect"});
    }
  } catch(err){
    return res.status(404).json({ message: "Some error occured!!!" , error : err.message});
  }
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Logout
 * URL         : /dev/logout
 * METHOD TYPE : GET
 * AUTH        : Public
 * 
 * DESCRIPTION : Logs out developer session.
 * 
 * DATA REQUIRED:
 *   - None
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Logged out successfully" }
 * -----------------------------------------------------------------------------
 */
export const logoutDeveloper = async (req,res)=>{
  return res.status(200).json({message : "Logged out successfully"});
}

/**
 * -----------------------------------------------------------------------------
 * HELPER / INTERNAL : Remove Developer Account
 * URL               : /dev/:username/remove (Internal helper)
 * METHOD TYPE       : DELETE / GET
 * AUTH              : Public / Dev Auth
 * 
 * DESCRIPTION       : Deletes a developer account from database by username.
 * 
 * DATA REQUIRED:
 *   - Params : :username (string)
 * 
 * RETURNS:
 *   - 200 OK  : { message: "dev removed" }
 *   - 404 Err : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
export const removeDeveloper = async (req,res)=>{
  try{
    await Developer.deleteOne({username : req.params.username});
    return res.status(200).json({message : "dev removed"});
  }
  catch(error) {
    return res.stauts(404).json({message : "Error !!", error: error.message});
  }
}