import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { createToken } from "../service/userAuth.js";
import { User } from "./../models/User.js";
import { userValidation } from "./../validation/userValidation.js";
import { deleteChat } from "./chat.js";
import { userExitFromGroup } from "./group.js";
import { hashInput , compareInput } from "../utils/bcrypt.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Signup
 * URL         : /user/signup
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Registers a new user in the system. Validates payload via userValidation 
 *               Joi schema, hashes password, and optionally uploads profile picture to Cloudinary.
 * 
 * DATA REQUIRED:
 *   - Form-Data / Body:
 *       - username (string) [Required]        : Lowercase letters only
 *       - password (string) [Required]        : Min 6 chars, 1 uppercase, 1 number, 1 special char
 *       - nickName (string) [Required]        : Display nickname
 *       - isPrivateAccount (boolean) [Option] : Privacy flag
 *       - profilePhoto (file) [Optional]      : Multipart form image file
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "New User Added" }
 *   - 404 Not Found    : { message: "user already exists with same username" | "Error Occured while adding user!!!" | validation error }
 * -----------------------------------------------------------------------------
 */
export const signupUser = async (req, res) => {
  let { error } = userValidation.validate(req.body);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }
  let user = await User.findOne({ username: req.body.username });
  if (user) {
    return res.status(404).json({ message: "user already exists with same username" });
  }

  const payload = {
    username: req.body.username,
    password: await hashInput(req.body.password),
  };

  const profilePhotoLocalPath = req.file ? req.file.path : "";

  const profilePhotoResult = profilePhotoLocalPath ? await uploadOnCloudinary(profilePhotoLocalPath, `${req.body.username}`) : "";

  if(req.body.nickName) payload.nickName = req.body.nickName;
  if(req.body.isPrivateAccount != undefined) payload.isPrivateAccount = req.body.isPrivateAccount;
  if(profilePhotoResult) payload.profilePhoto = profilePhotoResult.secure_url;
  user = new User(payload);
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Login
 * URL         : /user/login
 * METHOD TYPE : POST
 * AUTH        : Public (No token required)
 * 
 * DESCRIPTION : Authenticates user credentials (username and password) and generates 
 *               a JWT token for authorized endpoints.
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
export const loginUser = async (req, res) => {
  try {
    await User.findOne({ username: req.body.username })
      .then((user) => {
        if (compareInput(req.body.password, user.password)) {
          let token = createToken({ username : user.username });
          // save token in header authentication
          if (token) {
            return res.status(200).json({ message: "Login Successful", token : token});
          } else {
            return res.status(500).json({ message: "Internal Error" });
          }

        }
        return res.status(404).json({ message: "password is incorrect" });
      })
      .catch((err) => {
        return res.status(404).json({ message: "Username is Incorrect", error : err });
      });
  } catch (err) {
    return res.status(404).json({ message: "some error occured!!!" , error : err});
  }
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Search / Find Users (With Pagination)
 * URL         : /user/find OR /user/:input/find
 * METHOD TYPE : GET
 * AUTH        : Public
 * 
 * DESCRIPTION : Searches users by username or nickname matching regex (case-insensitive) 
 *               with pagination support.
 * 
 * DATA REQUIRED:
 *   - Params       : :input (string) [Optional path parameter]
 *   - Query Params : 
 *       - input / search / q (string) : Search string (if not in path)
 *       - page (number, default: 1)   : Page number
 *       - limit (number, default: 10) : Number of items per page
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Users found.", pagination: { totalUsers, currentPage, totalPages, limit, hasNextPage, hasPrevPage }, users: [ ... ] }
 *   - 400 Bad Request  : { message: "Search input parameter is required." }
 *   - 404 Not Found    : { message: "No result found." | "Error!!" }
 * -----------------------------------------------------------------------------
 */
export const findUser = async (req, res) => {
  const data = req.params.input || req.query.input || req.query.search || req.query.q;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  if (!data) {
    return res.status(400).json({ message: "Search input parameter is required." });
  }

  const pageNum = Math.max(1, page);
  const limitNum = Math.max(1, limit);
  const skip = (pageNum - 1) * limitNum;

  try {
    const filter = {
      $or: [
        { username: { $regex: data, $options: "i" } },
        { nickName: { $regex: data, $options: "i" } },
      ],
    };

    const totalUsers = await User.countDocuments(filter);

    // find users matching username or nickName with pagination
    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limitNum);

    if (users.length) {
      const totalPages = Math.ceil(totalUsers / limitNum);
      return res.status(200).json({
        message: "Users found.",
        pagination: {
          totalUsers,
          currentPage: pageNum,
          totalPages,
          limit: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        users,
      });
    } else {
      return res.status(404).json({ message: "No result found." });
    }
  } catch (err) {
    return res.status(404).json({ message: "Error!!", error: err.message });
  }
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Authenticated User Profile
 * URL         : /user/profile
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves profile object of currently logged in user (excluding password).
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK          : User Object (without password field)
 *   - 400 Bad Request : { message: "Not found." }
 *   - 404 Not Found   : { message: "Error!!", error }
 * -----------------------------------------------------------------------------
 */
export const getSelfProfile = async(req,res)=>{
  let username = req.username;
  await User.findOne({ username }).select("-password")
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Target User Profile By Username
 * URL         : /user/:username/profile
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Retrieves public profile details of a target user by username.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :username (string) - Username of user to view
 * 
 * RETURNS     :
 *   - 200 OK          : User Object (without password field)
 *   - 400 Bad Request : { message: "User not found." }
 *   - 404 Not Found   : { message: "Error!!", error }
 * -----------------------------------------------------------------------------
 */
export const getUser = async (req, res) => {
  let username = req.params.username;

  await User.findOne({ username }).select("-password")
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Follow A User
 * URL         : /user/:username/follow
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Current user follows target user. Updates followings and followers lists. 
 *               If target user is already following current user, adds to friends list.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :username (string) - Target username to follow
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "Followed Successfully" }
 *   - 400 Bad Request : { message: "You can't unfollow yourself" | "User not found" }
 *   - 404 Not Found   : { message: "Something went wrong" }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Unfollow A User
 * URL         : /user/:username/unfollow
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Current user unfollows target user. Removes target from followings/followers 
 *               and friends lists if applicable.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :username (string) - Target username to unfollow
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "Unfollowed Successfully" }
 *   - 400 Bad Request : { message: "You can't unfollow yourself" | "User not found" }
 *   - 404 Not Found   : { message: "Something went wrong" }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : User Logout
 * URL         : /user/logout
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Returns logout confirmation. Client removes local stored JWT token.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK  : { message: "Logout Successful" }
 * -----------------------------------------------------------------------------
 */
export const logoutUser = async (req, res) => {
  return res.status(200).json({ message: "Logout Successful" });
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Delete Chat Message By Sender
 * URL         : /user/group/:groupId/chat/:chatId/delete
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Sender Only)
 * 
 * DESCRIPTION : Allows the message sender to redact/delete their own chat message.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : 
 *       - :groupId (string) : Group ObjectId
 *       - :chatId (string)  : Chat ObjectId to delete
 * 
 * RETURNS     :
 *   - 200 OK          : { message: { message: "deleted successfully" } }
 *   - 400 Bad Request : { message: "Chat not found." | "You can't delete other's chat" }
 *   - 404 Not Found   : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Remove User From Group (Group Admin Only)
 * URL         : /user/group/:groupId/:targetUsername/remove
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Group Admin)
 * 
 * DESCRIPTION : Enables group admin to remove a target member from the group.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : 
 *       - :groupId (string)        : Group ObjectId
 *       - :targetUsername (string) : Username of member to remove
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "removed from the group successfully..." }
 *   - 400 Bad Request : { message: "Only admin is supposed to remove the members" }
 *   - 404 Not Found   : { message: "Error!!", error }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Edit Profile (Legacy / Alternative)
 * URL         : /user/:username/:profile/edit
 * METHOD TYPE : GET / POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Edits nickname of authenticated user matching username.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :username (string)
 *   - Body    : { nickName (string) }
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "Nickname changed successfully" }
 *   - 400 Bad Request : { message: "You can't change someone's profile" }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Ban User (Developer Only)
 * URL         : /dev/user/:username/ban
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Removes user from all joined groups and permanently deletes user account.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 *   - Params  : :username (string) - User to ban
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "User banned" }
 *   - 400 Bad Request : { message: "User not found" }
 *   - 404 Not Found   : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
export const banUser = async(req,res)=>{
  let username = req.params.username;
  try {
    let user = await User.findOne({username}).select("-password");

    if(!user) {
      return res.status(400).json({message : "User not found"});
    }

    for(let groupId of user.groups){
      await userExitFromGroup(user.username,groupId);
    }
    await user.deleteOne();
    return res.status(200).json({message : "User banned"});
  } catch(error) {
    return res.status(404).json({message : "Error !!", error});
  }
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Change Nickname
 * URL         : /user/edit/:nickName
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Updates nickname for the currently authenticated user.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :nickName (string) - New display nickname
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "NickName Changed Successfully" }
 *   - 404 Not Found : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
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