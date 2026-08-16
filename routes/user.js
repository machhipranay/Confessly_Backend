import express from 'express';
import { 
  signupUser, 
  loginUser, 
  findUser, 
  getSelfProfile, 
  getUser, 
  changeNickName, 
  followUser, 
  unfollowUser, 
  logoutUser 
} from '../controller/user.js';
import { userAuthMiddleware } from '../service/userAuth.js';
import { upload } from '../utils/multer.js';

const router = express.Router();

// =============================================================================
// USER & PROFILE ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Signup
 * URL         : /user/signup
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Registers a new user with optional profile photo upload to Cloudinary.
 * 
 * DATA REQUIRED:
 *   - Form-Data / Body:
 *       - username (string) [Required]        : Lowercase letters only
 *       - password (string) [Required]        : Min 6 chars, 1 uppercase, 1 number, 1 special char
 *       - nickName (string) [Required]        : Display nickname
 *       - isPrivateAccount (boolean) [Option] : Privacy flag
 *       - profilePhoto (file) [Optional]      : Image file (multipart/form-data)
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New User Added" }
 *   - 404 Not Found    : { message: "user already exists with same username" | "Error Occured while adding user!!!" }
 * -----------------------------------------------------------------------------
 */
router.post('/signup', upload.single('profilePhoto'), signupUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Login
 * URL         : /user/login
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Verifies user credentials and returns a JWT authentication token.
 * 
 * DATA REQUIRED:
 *   - Body (JSON):
 *       - username (string) [Required] : Registered username
 *       - password (string) [Required] : User password
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Login Successful", token: "<jwt_token>" }
 *   - 404 Not Found    : { message: "Username is Incorrect" | "password is incorrect" }
 *   - 500 Internal Err : { message: "Internal Error" }
 * -----------------------------------------------------------------------------
 */
router.post('/login', loginUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Search / Find Users (Query-based & Param-based)
 * URL         : /user/find OR /user/:input/find
 * METHOD TYPE : GET
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Searches users by matching username or nickName (case-insensitive) 
 *               with pagination support.
 * 
 * DATA REQUIRED:
 *   - Params           : :input (string) [Optional path parameter]
 *   - Query Params     : 
 *       - input / search / q (string) : Search string (if not in path)
 *       - page (number, default 1)   : Page number
 *       - limit (number, default 10) : Results per page
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Users found.", pagination: { totalUsers, currentPage, totalPages, limit, hasNextPage, hasPrevPage }, users: [ ... ] }
 *   - 400 Bad Request  : { message: "Search input parameter is required." }
 *   - 404 Not Found    : { message: "No result found." }
 * -----------------------------------------------------------------------------
 */
router.get('/find', findUser);
router.get('/:input/find', findUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Own User Profile
 * URL         : /user/profile
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves profile details of the currently authenticated user.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : User Object (without password field)
 *   - 400 Bad Request  : { message: "Not found." }
 *   - 404 Not Found    : { message: "Error!!", error: <error_details> }
 * -----------------------------------------------------------------------------
 */
router.get('/profile', userAuthMiddleware, getSelfProfile);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Other User Profile By Username
 * URL         : /user/:username/profile
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves public profile details of a target user by username.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :username (string) - Target user's username
 * 
 * RETURNS     :
 *   - 200 OK           : User Object (without password field)
 *   - 400 Bad Request  : { message: "User not found." }
 *   - 404 Not Found    : { message: "Error!!", error: <error_details> }
 * -----------------------------------------------------------------------------
 */
router.get('/:username/profile', userAuthMiddleware, getUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Change User Nickname
 * URL         : /user/edit/:nickName
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Updates the authenticated user's nickname.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :nickName (string) - New nickname to set
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "NickName Changed Successfully" }
 *   - 404 Not Found    : { message: "Error !!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
router.get('/edit/:nickName', userAuthMiddleware, changeNickName);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Follow A User
 * URL         : /user/:username/follow
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Follows a target user. If mutual following occurs, both users 
 *               are automatically added to each other's friends list.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :username (string) - Target username to follow
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Followed Successfully" }
 *   - 400 Bad Request  : { message: "You can't unfollow yourself" | "User not found" }
 *   - 404 Not Found    : { message: "Something went wrong" }
 * -----------------------------------------------------------------------------
 */
router.get('/:username/follow', userAuthMiddleware, followUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Unfollow A User
 * URL         : /user/:username/unfollow
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Unfollows a target user and removes friendship relationship if exists.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :username (string) - Target username to unfollow
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Unfollowed Successfully" }
 *   - 400 Bad Request  : { message: "You can't unfollow yourself" | "User not found" }
 *   - 404 Not Found    : { message: "Something went wrong" }
 * -----------------------------------------------------------------------------
 */
router.get('/:username/unfollow', userAuthMiddleware, unfollowUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Logout
 * URL         : /user/logout
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Invalidates/clears current user session on client side.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Logout Successful" }
 * -----------------------------------------------------------------------------
 */
router.get('/logout', userAuthMiddleware, logoutUser);

export default router;
