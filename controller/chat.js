import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { chatValidation } from "../validation/chatValidation.js";

// post request 
// url : /user/group/:groupId/chat/new
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

// // url : /user/group/:groupId/chat/:chatId/edit
// export const editChat = async (req,res)=>{
  // }
  
export const deleteChat = async (chatId, byWhom = "") => { // seems problem in this function
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
}; // returns object of responce

// url : user/group/:groupId/chat
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
}; // return list of chats

// function which finds chat by Id
export const getChatById = async(chatId)=>{
  let chat = await Chat.findOne({_id : chatId});
  return chat;
}