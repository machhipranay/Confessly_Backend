import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { chatValidation } from "../validation/chatValidation.js";

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
 *   - 200 OK        : { message: "New Chat Added" }
 *   - 404 Not Found : { message: "Something went wrong." | validation error }
 * -----------------------------------------------------------------------------
 */
export const createNewChat = async (req, res) => {
  let groupId = req.params.groupId;
  let { content, isConfession} = req.body;
  let sender = req.username;
  let newChat = { content, isConfession, group: groupId, from: sender };

  let { error } = chatValidation.validate(newChat);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }
  let group = await Group.findOne({_id: groupId});
  
  let chat = new Chat(newChat);
  group.chats.push(chat._id);
  await group.save();
  await chat.save()
  .then(() => {
      return res.status(200).json({ message: "New Chat Added" });
    })
    .catch((err) => {
      return res.status(404).json({ message: "Something went wrong." });
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
 *   - 200 OK          : { message: "Chat found", chats: [ ... ] }
 *   - 400 Bad Request : { message: "Group doesnot exists" }
 *   - 404 Not Found   : { message: "Error!!", error }
 * -----------------------------------------------------------------------------
 */
export const getChatsOfGroup = async (req, res) => {
  let groupId = req.params.groupId;
  try {
    let group = await Group.findOne({ _id: groupId });
    if (!group) {
      return res.status(400).json({ message: "Group doesnot exists" });
    }
    const chats = await Promise.all(
      group.chats.map((chatId) => getChatById(chatId))
    );
    return res.status(200).json({ message: "Chat found", chats });
  } catch (error) {
    return res.status(404).json({ message: "Error!!", error: error.message});
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