import { Developer } from "../models/Developer.js";
import { createToken } from "../service/devAuth.js";
import { ApiResponse } from "../utils/ApiResponse.js";
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
 *   - 200 OK           : { success: true, statusCode: 200, message: "New Developer Added", data: null, error: null }
 *   - 400 Bad Request  : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const signupDeveloper = async (req, res) => {
  const payload = {
    username : req.body.username,
    password : req.body.password
  }
  let { error } = devValidation.validate(payload);
  if (error) {
    return ApiResponse.error(res, 400, error.details[0].message, error.details[0].message);
  }

  let developer = await Developer.findOne({username : req.body.username}).select("-password");
  if (developer) {
    return ApiResponse.error(res, 400, "Developer already exists");
  }

  payload.password = await hashInput(req.body.password);

  developer = new Developer(payload);
  await developer
    .save()
    .then(() => {
      return ApiResponse.success(res, 200, "New Developer Added");
    })
    .catch((err) => {
      return ApiResponse.error(res, 400, "Error Occured while adding developer!!!", err.message || err);
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
 *   - 200 OK           : { success: true, statusCode: 200, message: "Login Successful As Developer", data: { token }, error: null }
 *   - 400 Bad Request  : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const loginDeveloper = async (req,res)=>{
  try {
    let developer = await Developer.findOne({username : req.body.username});
    if(developer){
      if(compareInput(req.body.password,developer.password)){
        let token = createToken({username : developer.username});
        return ApiResponse.success(res, 200, "Login Successful As Developer", { token });
      }
      return ApiResponse.error(res, 400, "Password is incorrect");
    } else {
      return ApiResponse.error(res, 400, "Username is incorrect");
    }
  } catch(err){
    return ApiResponse.error(res, 400, "Some error occured!!!", err.message);
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
 *   - 200 OK           : { success: true, statusCode: 200, message: "Logged out successfully", data: null, error: null }
 * -----------------------------------------------------------------------------
 */
export const logoutDeveloper = async (req,res)=>{
  return ApiResponse.success(res, 200, "Logged out successfully");
}

/**
 * -----------------------------------------------------------------------------
 * HELPER / INTERNAL : Remove Developer Account
 * URL               : /dev/:username/remove
 * METHOD TYPE       : DELETE
 * AUTH              : Dev Auth
 * 
 * DESCRIPTION       : Deletes a developer account from database by username.
 * 
 * DATA REQUIRED:
 *   - Params : :username (string)
 * 
 * RETURNS:
 *   - 200 OK  : { success: true, statusCode: 200, message: "Developer removed successfully", data: null, error: null }
 *   - 404 Err : { success: false, statusCode: 404, message: "Developer not found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const removeDeveloper = async (req, res) => {
  try {
    const { username } = req.params;

    const result = await Developer.deleteOne({ username });

    // Developer not found
    if (result.deletedCount === 0) {
      return ApiResponse.error(res, 404, "Developer not found");
    }

    // Successfully deleted
    return ApiResponse.success(res, 200, "Developer removed successfully");

  } catch (error) {
    return ApiResponse.error(res, 500, "Error removing developer", error.message);
  }
};