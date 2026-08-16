import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { chatValidation } from "../validation/chatValidation.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Create / Send New Chat Message
 * URL         : /user/group/:groupId/chat/new
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Sends a new message or anonymous confession inside a group chat. 
 *               Validates message content with chatValidation schema before saving.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :groupId (string) - MongoDB ObjectId of group
 *   - Body (JSON):
 *       - content (string) [Required]        : Chat message body text
 *       - isConfession (boolean) [Optional]  : If true, sender identity is kept secret (default: false)
 * 
 * RETURNS     :
 *   - 200 OK        : { success: true, statusCode: 200, message: "New Chat Added", data: null, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const createNewChat = async (req, res) => {
  let groupId = req.params.groupId;
  let { content, isConfession} = req.body;
  let sender = req.username;
  let newChat = { content, isConfession, group: groupId, from: sender };

  let { error } = chatValidation.validate(newChat);
  if (error) {
    return ApiResponse.error(res, 400, error.details[0].message, error.details[0].message);
  }
  let group = await Group.findOne({_id: groupId});
  if (!group) {
    return ApiResponse.error(res, 404, "Group does not exist");
  }
  
  let chat = new Chat(newChat);
  group.chats.push(chat._id);
  await group.save();
  await chat.save()
    .then(() => {
      return ApiResponse.success(res, 200, "New Chat Added");
    })
    .catch((err) => {
      return ApiResponse.error(res, 400, "Something went wrong.", err.message || err);
    });
};

/**
 * -----------------------------------------------------------------------------
 * HELPER      : Internal Function - Redact / Soft Delete Chat Message
 * DESCRIPTION : Redacts the chat content with a deletion notice indicating 
 *               who requested deletion (e.g. sender username or "developer").
 * -----------------------------------------------------------------------------
 */
export const deleteChat = async (chatId, byWhom = "") => {
  try {
    await Chat.updateOne(
      { _id: chatId },
      {
        $set: {
          content: `XX -- This Message is being deleted by ${byWhom} -- XX`,
        },
      }
    );
    return { message : "deleted successfully"};
  } catch (err) {
    return {message : "Something went wrong..."};
  }
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Messages Of A Group
 * URL         : /user/group/:groupId/chat
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves all chat messages associated with a given group ID.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :groupId (string) - MongoDB ObjectId of group
 * 
 * RETURNS     :
 *   - 200 OK          : { success: true, statusCode: 200, message: "Chat found", data: { chats: [...] }, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "Group doesnot exists", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getChatsOfGroup = async (req, res) => {
  let groupId = req.params.groupId;
  try {
    let group = await Group.findOne({ _id: groupId });
    if (!group) {
      return ApiResponse.error(res, 404, "Group doesnot exists");
    }
    const chats = await Promise.all(
      group.chats.map((chatId) => getChatById(chatId))
    );
    return ApiResponse.success(res, 200, "Chat found", { chats });
  } catch (error) {
    return ApiResponse.error(res, 400, "Error!!", error.message || error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * HELPER      : Internal Function - Get Chat Document By ID
 * DESCRIPTION : Finds and returns a chat object by its MongoDB ObjectId.
 * -----------------------------------------------------------------------------
 */
export const getChatById = async(chatId)=>{
  let chat = await Chat.findOne({_id : chatId});
  return chat;
}