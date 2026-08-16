import express from 'express';
import { createNewChat, getChatsOfGroup } from '../controller/chat.js';
import { deleteChatBySender } from '../controller/user.js';
import { userAuthMiddleware } from '../service/userAuth.js';

const router = express.Router();

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
router.post('/group/:groupId/chat/new', userAuthMiddleware, createNewChat);

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
router.get('/group/:groupId/chat/:chatId/delete', userAuthMiddleware, deleteChatBySender);

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
router.get('/group/:groupId/chat', userAuthMiddleware, getChatsOfGroup);

export default router;
