import express from 'express';
import { 
  createGroup, 
  getInviteCode, 
  joinGroup, 
  searchGroupsByName, 
  getGroups, 
  exitGroup 
} from '../controller/group.js';
import { removeUserFromGroup } from '../controller/user.js';
import { userAuthMiddleware } from '../service/userAuth.js';

const router = express.Router();

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
router.get('/group/:name/create', userAuthMiddleware, createGroup);

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
router.get('/group/:groupId/inviteCode/generate', userAuthMiddleware, getInviteCode);

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
router.get('/group/:inviteCode/join', userAuthMiddleware, joinGroup);

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
router.get('/search/group/:name', userAuthMiddleware, searchGroupsByName);

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
router.get('/group', userAuthMiddleware, getGroups);

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
router.get('/group/:groupId/exit', userAuthMiddleware, exitGroup);

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
router.get('/group/:groupId/:targetUsername/remove', userAuthMiddleware, removeUserFromGroup);

export default router;
