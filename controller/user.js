import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { createToken } from "../service/userAuth.js";
import { User } from "./../models/User.js";
import { userValidation } from "./../validation/userValidation.js";
import { deleteChat } from "./chat.js";
import { userExitFromGroup } from "./group.js";

// function which adds new User to database (sign Up)
// url : /user/signup
export const signupUser = async (req, res) => {
  let { error } = userValidation.validate(req.body);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }
  let user = await User.findOne({ username: req.body.username });
  if (user) {
    return res.status(404).json({ message: "user already exists" });
  }

  user = new User(req.body);
  await user
    .save()
    .then(() => {
      return res.status(200).json({ message: "New User Added" });
    })
    .catch(() => {
      return res
        .status(404)
        .json({ message: "Error Occured while adding user!!!" });
    });
};

// function to login with username & password 
// url : /user/login
export const loginUser = async (req, res) => {
  try {
    await User.findOne({ username: req.body.username })
      .then((user) => {
        if (user.password == req.body.password) {
          let token = createToken(user);
          req.header.token = token;
          return res.status(200).json({ message: "Login Successful", token : token});
        }
        return res.status(404).json({ message: "password is incorrect" });
      })
      .catch((err) => {
        return res.status(404).json({ message: "Username is Incorrect" });
      });
  } catch (err) {
    return res.status(404).json({ message: "some error occured!!!" });
  }
};

// function which finds users from database ( Search ) ( Priority to username then nickName )
// url : /user/:input/find
export const findUser = async (req, res) => {
  let data = req.params.input;
  try {
    const users = await User.find({
      nickName: { $regex: data, $options: "i" },
      username: { $ne: data },
    });

    const userViaUsername = await User.findOne({ username: data });

    if (userViaUsername) {
      users.splice(0, 0, userViaUsername);
    }

    if (users.length) {
      res.status(200).json({ message: "Users found.", users });
    } else {
      res.status(404).json({ message: "No result found." });
    }
  } catch (err) {
    console.error("Something went wrong.");
  }
};

export const getSelfProfile = async(req,res)=>{
  let username = req.username;
  await User.findOne({ username })
    .then((user) => {
      if(user){
        return res.status(200).json(user);
      }
      return res.status(400).json({message : "Not found."});
    })
    .catch((err) => {
      return res.status(404).json({message : "Error!!",error : err});
    });
}

// function which finds user by username and returns it ( Profile )
// url : /user/:username/profile
export const getUser = async (req, res) => {
  let username = req.params.username;

  await User.findOne({ username })
    .then((user) => {
      if(user){
        return res.status(200).json(user);
      }
      return res.status(400).json({message : "User not found."});
    })
    .catch((err) => {
      return res.status(404).json({message : "Error!!",error : err});
    });
};

// follow user
// url : /user/:username/follow
export const followUser = async (req, res) => {
  // const currentUsername = req.user.username;
  const currentUsername = req.username;
  const targetUsername = req.params.username;

  if (currentUsername == targetUsername)
    return res.status(400).json({ message: "You can't unfollow yourself" });
  try {
    const currUser = await User.findOne({ username: currentUsername });
    const targetUser = await User.findOne({ username: targetUsername });

    if (currUser && targetUser) {
      let idx = currUser.followers.indexOf(targetUsername);
      if (idx != -1) {
        currUser.friends.push(targetUsername);
        targetUser.friends.push(currentUsername);
      }

      currUser.followings.push(targetUsername);

      targetUser.followers.push(currentUsername);

      await currUser.save();
      await targetUser.save();
    } else {
      return res.status(400).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "Followed Successfully" });
  } catch (err) {
    return res.status(404).json({ message: "Something went wrong" });
  }
};

// unfollow user
// url : /user/:username/unfollow
export const unfollowUser = async (req, res) => {
  const currentUsername = req.username;
  const targetUsername = req.params.username;

  if (currentUsername == targetUsername)
    return res.status(400).json({ message: "You can't unfollow yourself" });

  try {
    const currUser = await User.findOne({ username: currentUsername });
    const targetUser = await User.findOne({ username: targetUsername });

    if (currUser && targetUser) {
      let idx = currUser.friends.indexOf(targetUsername);
      if (idx != -1) {
        currUser.friends.splice(idx, 1);
        idx = targetUser.friends.indexOf(currentUsername);
        targetUser.friends.splice(idx, 1);
      }
      idx = currUser.followings.indexOf(targetUsername);
      currUser.followings.splice(idx, 1);

      idx = targetUser.followers.indexOf(currentUsername);
      targetUser.followers.splice(idx, 1);

      await currUser.save();
      await targetUser.save();
    } else {
      return res.status(400).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "Unfollowed Successfully" });
  } catch (err) {
    return res.status(404).json({ message: "Something went wrong" });
  }
};

// url : /user/logout
export const logoutUser = async (req, res) => {
  if (req.header.token) {
    delete req.headers.token;
  }
  return res.status(200).json({ message: "Logged out Successfully" });
};

// url : /user/group/:groupId/chat/:chatId/delete
export const deleteChatBySender = async (req,res)=>{
  let username = req.username;
  let chatId = req.params.chatId;
  try {
    let chat = await Chat.findOne({_id : chatId});
    if(!chat) return res.status(400).json({message : "Chat not found."});
    if(chat.from == username){
      return res.status(200).json({message : await deleteChat(chat._id,username)});
    } else {
      return res.status(400).json({message : "You can't delete other's chat"});
    }
  } catch(error) {
      return res.status(404).json({message : "Error !!", error})
  }
}

// url : /user/group/:groupId/:targetUsername/remove
export const removeUserFromGroup = async(req,res)=>{
  let username = req.username;
  let groupId = req.params.groupId;
  let targetUsername = req.params.targetUsername;
  try {
    let group = await Group.findOne({_id : groupId});
    if(group.admin == username){
      return res.status(200).json({message : await userExitFromGroup(targetUsername,groupId)});
    } else {
      return res.status(400).json({message : "Only admin is supposed to remove the members"});
    }
  } catch(error) {
    return res.status(404).json({message : "Error!!", error});
  }
}

// url : /user/:username/:profile/edit
export const editProfile = async(req,res)=>{
  if(req.params.username != req.username){
    return res.status(400).json({message : "You can't change someone's profile"});
  }
  let nickName = req.body.nickName;
  await User.updateOne(
    {username : req.username},
    {$set : {nickName : nickName}}
  );
  return res.status(200).json({message : "Nickname changed successfully"});
}

// url : /dev/user/:username/ban
export const banUser = async(req,res)=>{
  let username = req.params.username;
  try {
    let user = await User.findOne({username});
    for(let groupId of user.groups){
      await userExitFromGroup(user.username,groupId);
    }
    await user.deleteOne();
    return res.status(200).json({message : "User banned"});
  } catch(error) {
    return res.status(404).json({message : "Error!!", error});
  }
}

// url : /user/edit/:nickName
export const changeNickName = async(req,res)=>{
  let username = req.username;
  let nickName = req.params.nickName;
  try {
    await User.updateOne(
      {username},
      {$set : {nickName}}
    );
    res.status(200).json({message : "NickName Changed Successfully"});
  } catch (error) {
    res.status(404).json({message : "Error !!", error : error.message});
  }
}