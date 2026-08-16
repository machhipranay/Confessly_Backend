import express from 'express';
import cors from 'cors';
// import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import {signupUser, loginUser, findUser,followUser,unfollowUser, logoutUser, getUser, banUser, deleteChatBySender, removeUserFromGroup, editProfile, changeNickName, getSelfProfile} from './controller/user.js'
import { userAuthMiddleware } from './service/userAuth.js';
import { loginDeveloper, signupDeveloper, logoutDeveloper} from './controller/developer.js';
import { devAuthMiddleware } from './service/devAuth.js';
import { createGroup, exitGroup, getGroups, getInviteCode, joinGroup, searchGroupsByName } from './controller/group.js';
import { actionReport, dismissReport, getActionTakenReports,getPendingReports, getDismissedReports, viewReport, createReport } from './controller/report.js';
import { createNewChat, getChatsOfGroup } from './controller/chat.js';
import { upload } from './utils/multer.js';
import cloudinary from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
// app.use(express.static(path.join(__dirname,'/public')));

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

mongoose.connect(process.env.MONGO_URL)
.then(()=>{
  app.listen(process.env.PORT, ()=>{
      console.log("Server is listening on port : ", process.env.PORT);
  });
  console.log("Database connected successfully");
})
.catch(()=>{
  console.log("Some error occured while connecting database");
})

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
app.post('/dev/login', loginDeveloper);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Developer Signup (Internal / Maintenance)
 * URL         : /dev/signup
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Registers a new developer account into the system. 
 *               Validates input payload against devValidation schema.
 * 
 * DATA REQUIRED:
 *   - Body (JSON):
 *       - username (string) [Required] : Lowercase letters only
 *       - password (string) [Required] : Min 6 chars, 1 uppercase, 1 number, 1 special char
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New Developer Added" }
 *   - 404 Not Found    : { message: "Developer already exists" | validation error }
 * -----------------------------------------------------------------------------
 */
app.post('/dev/signup', signupDeveloper); // recently not used

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
app.get('/dev/logout', logoutDeveloper);

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
app.get('/dev/user/:username/ban', devAuthMiddleware, banUser);


// =============================================================================
// DEVELOPER REPORTS HANDLING ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Take Action On Report (Delete Reported Chat)
 * URL         : /dev/reports/:reportId/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Approves action on a report. Deletes/redacts the reported chat content 
 *               and updates the status of all reports associated with that chat to 'action_taken'.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "deleted successfully" }
 *   - 400 Bad Request  : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/:reportId/actionTaken', devAuthMiddleware, actionReport);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Dismiss Report
 * URL         : /dev/reports/:reportId/dismiss
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Marks a reported item as reviewed and dismissed without altering the chat message.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "report dismissed" }
 *   - 400 Bad Request  : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/:reportId/dismiss', devAuthMiddleware, dismissReport);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Pending Reports
 * URL         : /dev/reports/pending
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all user reports with status 'pending' awaiting dev review.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/pending', devAuthMiddleware, getPendingReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Action-Taken Reports
 * URL         : /dev/reports/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all user reports that have been resolved with action taken.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/actionTaken', devAuthMiddleware, getActionTakenReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Dismissed Reports
 * URL         : /dev/reports/dismissed
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all reports that were reviewed and dismissed by developers.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/dismissed', devAuthMiddleware, getDismissedReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : View Detailed Report Information
 * URL         : /dev/reports/:reportId/view
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Fetches complete detail for a specific report including reported user, 
 *               reporter, reason, description, and raw chat content.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Report Content...", responce: { _id, reportedUser, reporter, chatContent, reason, description, createdAt } }
 *   - 404 Not Found    : { message: "Error!!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/dev/reports/:reportId/view', devAuthMiddleware, viewReport);


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
app.post('/user/signup', upload.single('profilePhoto'), signupUser);

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
app.post('/user/login', loginUser);

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
app.get('/user/find', findUser);
app.get('/user/:input/find', findUser);

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
app.get('/user/profile', userAuthMiddleware, getSelfProfile);

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
app.get('/user/:username/profile', userAuthMiddleware, getUser);

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
app.get('/user/edit/:nickName', userAuthMiddleware, changeNickName);

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
app.get('/user/:username/follow', userAuthMiddleware, followUser);

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
app.get('/user/:username/unfollow', userAuthMiddleware, unfollowUser);

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
app.get('/user/logout', userAuthMiddleware, logoutUser); 

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Remove User From Group (Admin Only)
 * URL         : /user/group/:groupId/:targetUsername/remove
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Group Admin)
 * 
 * DESCRIPTION : Allows group admin to kick out a specified member from the group.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : 
 *       - :groupId (string)        : MongoDB ObjectId of the group
 *       - :targetUsername (string) : Username of member to remove
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "removed from the group successfully..." }
 *   - 400 Bad Request  : { message: "Only admin is supposed to remove the members" }
 *   - 404 Not Found    : { message: "Error!!", error: <error_details> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:groupId/:targetUsername/remove', userAuthMiddleware, removeUserFromGroup);


// =============================================================================
// GROUP ACTIONS ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Create New Group
 * URL         : /user/group/:name/create
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Creates a new group with the specified name and makes the requesting 
 *               user the group admin and first member.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :name (string) - Name of the new group
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New Group created successfully" }
 *   - 404 Not Found    : { message: "Error!!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:name/create', userAuthMiddleware, createGroup);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Generate Group Invite Code (Admin Only)
 * URL         : /user/group/:groupId/inviteCode/generate
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Group Admin)
 * 
 * DESCRIPTION : Generates a random 6-character invitation code valid for 1 hour 
 *               for joining the group.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :groupId (string) - MongoDB ObjectId of the group
 * 
 * RETURNS     :
 *   - 200 OK           : { inviteCode: "aB3x9Z" }
 *   - 400 Bad Request  : { message: "only admin is allowed to generate this code" }
 *   - 404 Not Found    : { message: "Group not found" | "Error", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:groupId/inviteCode/generate', userAuthMiddleware, getInviteCode);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Join Group Via Invite Code
 * URL         : /user/group/:inviteCode/join
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Adds current user to group using an active, non-expired 6-character invite code.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :inviteCode (string) - 6-character invite code
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Joined group successfully" }
 *   - 400 Bad Request  : { message: "Invite code expired" | "Already In Group" }
 *   - 404 Not Found    : { message: "Invalid Invite code" | "Error!!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:inviteCode/join', userAuthMiddleware, joinGroup);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Search User's Groups By Name
 * URL         : /user/search/group/:name
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Filters and searches through groups that current user has joined 
 *               matching prefix name.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :name (string) - Prefix name pattern to search
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Groups found", groups: [ ... ] }
 *   - 400 Bad Request  : { message: "Groups not found", groups: [] }
 *   - 404 Not Found    : { message: "Error !!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/search/group/:name', userAuthMiddleware, searchGroupsByName);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All User Joined Groups
 * URL         : /user/group
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Fetches complete details of all groups current authenticated user belongs to.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Found Groups", groups: [ ... ] }
 *   - 404 Not Found    : { message: "Error", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group', userAuthMiddleware, getGroups);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Exit Group
 * URL         : /user/group/:groupId/exit
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Removes current user from the specified group. If admin exits and 
 *               is sole member, group is deleted.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :groupId (string) - MongoDB ObjectId of group
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "removed from the group successfully..." }
 *   - 404 Not Found    : { message: "Error !!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:groupId/exit', userAuthMiddleware, exitGroup);


// =============================================================================
// CHAT ACTIONS ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Send / Create New Chat Message
 * URL         : /user/group/:groupId/chat/new
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Creates and posts a new chat message or anonymous confession inside a group.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :groupId (string) - MongoDB ObjectId of target group
 *   - Body (JSON):
 *       - content (string) [Required]        : Message text
 *       - isConfession (boolean) [Optional]  : Flag for anonymous confession (default: false)
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New Chat Added" }
 *   - 404 Not Found    : { message: "Something went wrong." | validation error }
 * -----------------------------------------------------------------------------
 */
app.post('/user/group/:groupId/chat/new', userAuthMiddleware, createNewChat);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Delete Chat Message By Sender
 * URL         : /user/group/:groupId/chat/:chatId/delete
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Sender Only)
 * 
 * DESCRIPTION : Allows message sender to soft-delete/redact their posted chat message.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : 
 *       - :groupId (string) : MongoDB ObjectId of group
 *       - :chatId (string)  : MongoDB ObjectId of chat message
 * 
 * RETURNS     :
 *   - 200 OK           : { message: { message: "deleted successfully" } }
 *   - 400 Bad Request  : { message: "Chat not found." | "You can't delete other's chat" }
 *   - 404 Not Found    : { message: "Error !!", error: <error_details> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:groupId/chat/:chatId/delete', userAuthMiddleware, deleteChatBySender);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Group Chats
 * URL         : /user/group/:groupId/chat
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves list of all chat messages sent in the specified group.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : :groupId (string) - MongoDB ObjectId of group
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Chat found", chats: [ ... ] }
 *   - 400 Bad Request  : { message: "Group doesnot exists" }
 *   - 404 Not Found    : { message: "Error!!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
app.get('/user/group/:groupId/chat', userAuthMiddleware, getChatsOfGroup);


// =============================================================================
// REPORT ACTIONS ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Submit Report For Chat Message
 * URL         : /user/group/:groupId/chat/:chatId/report
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Flags a chat message for moderation by submitting a report to developers.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : 
 *       - :groupId (string) : MongoDB ObjectId of group
 *       - :chatId (string)  : MongoDB ObjectId of chat message
 *   - Body (JSON):
 *       - reason (string) [Required]      : One of ["spam", "harassment", "hate_speech", "nudity", "other"]
 *       - description (string) [Optional] : Additional explanation details
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Reported Successfully" }
 *   - 404 Not Found    : { message: "Error!!" | validation error }
 * -----------------------------------------------------------------------------
 */
app.post('/user/group/:groupId/chat/:chatId/report', userAuthMiddleware, createReport);


// =============================================================================
// GLOBAL FALLBACK ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Global Fallback GET Route
 * URL         : /* (Catch-all)
 * METHOD TYPE : GET
 * AUTH        : Public
 * 
 * DESCRIPTION : Handles unmatched GET routes.
 * -----------------------------------------------------------------------------
 */
app.get('/{*any}', (req, res) => {
  res.status(200).json({ message: "This is global get page" });
});

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Global Fallback POST Route
 * URL         : /* (Catch-all)
 * METHOD TYPE : POST
 * AUTH        : Public
 * 
 * DESCRIPTION : Handles unmatched POST routes.
 * -----------------------------------------------------------------------------
 */
app.post('/{*any}', (req, res) => {
  res.status(200).json({ message: "This is global post page" });
});