import express from 'express';
import { loginDeveloper, signupDeveloper, logoutDeveloper, removeDeveloper } from '../controller/developer.js';
import { banUser } from '../controller/user.js';
import { devAuthMiddleware } from '../service/devAuth.js';

const router = express.Router();

// =============================================================================
// DEVELOPER ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Login
 * URL         : /dev/login
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Authenticates developer credentials (username & password) and 
 *               returns a JWT authorization token.
 * 
 * DATA REQUIRED:
 *   - Body (JSON):
 *       - username (string) [Required] : Developer's username
 *       - password (string) [Required] : Developer's password
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Login Successful As Developer", token: "<jwt_token>" }
 *   - 404 Not Found    : { message: "Username is incorrect" | "Password is incorrect" | error }
 * -----------------------------------------------------------------------------
 */
router.post('/login', loginDeveloper);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Signup (Internal / Maintenance)
 * URL         : /dev/signup
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Registers a new developer account into the system. 
 *               Validates input payload against devValidation schema.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Body (JSON):
 *       - username (string) [Required] : Lowercase letters only
 *       - password (string) [Required] : Min 6 chars, 1 uppercase, 1 number, 1 special char
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New Developer Added" }
 *   - 404 Not Found    : { message: "Developer already exists" | validation error }
 * -----------------------------------------------------------------------------
 */
router.post('/signup', devAuthMiddleware, signupDeveloper); // recently not used

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Logout
 * URL         : /dev/logout
 * METHOD TYPE : GET
 * AUTH        : Public
 * 
 * DESCRIPTION : Logs out the current developer session.
 * 
 * DATA REQUIRED:
 *   - None
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Logged out successfully" }
 * -----------------------------------------------------------------------------
 */
router.get('/logout', logoutDeveloper);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Ban / Delete User Account
 * URL         : /dev/user/:username/ban
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Bans a user account by removing them from all joined groups and 
 *               permanently deleting the user document from the database.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :username (string) - Username of the user to ban
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "User banned" }
 *   - 400 Bad Request  : { message: "User not found" }
 *   - 404 Not Found    : { message: "Error !!", error: <error_details> }
 * -----------------------------------------------------------------------------
 */
router.get('/user/:username/ban', devAuthMiddleware, banUser);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Remove Developer Account
 * URL         : /dev/:username/remove
 * METHOD TYPE : DELETE
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Deletes a developer account from the database by username.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :username (string) - Username of the developer to remove
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "dev removed" }
 *   - 404 Not Found    : { message: "Error !!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
router.delete('/:username/remove', devAuthMiddleware, removeDeveloper);

export default router;
