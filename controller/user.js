import { Chat } from "../models/Chat.js";
import { Group } from "../models/Group.js";
import { createToken } from "../service/userAuth.js";
import { User } from "./../models/User.js";
import { userValidation } from "./../validation/userValidation.js";
import { deleteChat } from "./chat.js";
import { userExitFromGroup } from "./group.js";
import { hashInput , compareInput } from "../utils/bcrypt.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
 *   - 200 OK           : { success: true, statusCode: 200, message: "New User Added", data: null, error: null }
 *   - 400 Bad Request  : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const signupUser = async (req, res) => {
  let { error } = userValidation.validate(req.body);
  if (error) {
    return ApiResponse.error(res, 400, error.details[0].message, error.details[0].message);
  }
  let user = await User.findOne({ username: req.body.username });
  if (user) {
    return ApiResponse.error(res, 400, "user already exists with same username");
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
      return ApiResponse.success(res, 200, "New User Added");
    })
    .catch((err) => {
      return ApiResponse.error(res, 400, "Error Occured while adding user!!!", err.message || err);
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
 *   - 200 OK           : { success: true, statusCode: 200, message: "Login Successful", data: { token }, error: null }
 *   - 400 Bad Request  : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const loginUser = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.body.username });
    if (!user) {
      return ApiResponse.error(res, 400, "Username is Incorrect");
    }

    if (compareInput(req.body.password, user.password)) {
      let token = createToken({ username : user.username });
      if (token) {
        return ApiResponse.success(res, 200, "Login Successful", { token });
      } else {
        return ApiResponse.error(res, 500, "Internal Error");
      }
    }
    return ApiResponse.error(res, 400, "password is incorrect");
  } catch (err) {
    return ApiResponse.error(res, 400, "some error occured!!!", err.message || err);
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
 *   - 200 OK           : { success: true, statusCode: 200, message: "Users found.", data: { pagination, users }, error: null }
 *   - 400 Bad Request  : { success: false, statusCode: 400, message: "Search input parameter is required.", data: null, error: "..." }
 *   - 404 Not Found    : { success: false, statusCode: 404, message: "No result found.", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const findUser = async (req, res) => {
  const data = req.params.input || req.query.input || req.query.search || req.query.q;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;

  if (!data) {
    return ApiResponse.error(res, 400, "Search input parameter is required.");
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

    const users = await User.find(filter)
      .select("-password")
      .skip(skip)
      .limit(limitNum);

    if (users.length) {
      const totalPages = Math.ceil(totalUsers / limitNum);
      return ApiResponse.success(res, 200, "Users found.", {
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
      return ApiResponse.error(res, 404, "No result found.");
    }
  } catch (err) {
    return ApiResponse.error(res, 500, "Error!!", err.message);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "Profile fetched successfully", data: user, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "Not found.", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getSelfProfile = async(req,res)=>{
  let username = req.username;
  await User.findOne({ username }).select("-password")
    .then((user) => {
      if(user){
        return ApiResponse.success(res, 200, "Profile fetched successfully", user);
      }
      return ApiResponse.error(res, 404, "Not found.");
    })
    .catch((err) => {
      return ApiResponse.error(res, 500, "Error!!", err.message || err);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "User profile fetched successfully", data: user, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "User not found.", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getUser = async (req, res) => {
  let username = req.params.username;

  await User.findOne({ username }).select("-password")
    .then((user) => {
      if(user){
        return ApiResponse.success(res, 200, "User profile fetched successfully", user);
      }
      return ApiResponse.error(res, 404, "User not found.");
    })
    .catch((err) => {
      return ApiResponse.error(res, 500, "Error!!", err.message || err);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "Followed Successfully", data: null, error: null }
 *   - 400 Bad Request : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const followUser = async (req, res) => {
  const currentUsername = req.username;
  const targetUsername = req.params.username;

  if (currentUsername == targetUsername)
    return ApiResponse.error(res, 400, "You can't unfollow yourself");
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
      return ApiResponse.error(res, 404, "User not found");
    }
    return ApiResponse.success(res, 200, "Followed Successfully");
  } catch (err) {
    return ApiResponse.error(res, 500, "Something went wrong", err.message || err);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "Unfollowed Successfully", data: null, error: null }
 *   - 400 Bad Request : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const unfollowUser = async (req, res) => {
  const currentUsername = req.username;
  const targetUsername = req.params.username;

  if (currentUsername == targetUsername)
    return ApiResponse.error(res, 400, "You can't unfollow yourself");

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
      return ApiResponse.error(res, 404, "User not found");
    }
    return ApiResponse.success(res, 200, "Unfollowed Successfully");
  } catch (err) {
    return ApiResponse.error(res, 500, "Something went wrong", err.message || err);
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
 *   - 200 OK  : { success: true, statusCode: 200, message: "Logout Successful", data: null, error: null }
 * -----------------------------------------------------------------------------
 */
export const logoutUser = async (req, res) => {
  return ApiResponse.success(res, 200, "Logout Successful");
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "deleted successfully", data: null, error: null }
 *   - 400 Bad Request : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const deleteChatBySender = async (req,res)=>{
  let username = req.username;
  let chatId = req.params.chatId;
  try {
    let chat = await Chat.findOne({_id : chatId});
    if(!chat) return ApiResponse.error(res, 404, "Chat not found.");
    if(chat.from == username){
      let result = await deleteChat(chat._id, username);
      return ApiResponse.success(res, 200, result.message || "deleted successfully");
    } else {
      return ApiResponse.error(res, 403, "You can't delete other's chat");
    }
  } catch(error) {
      return ApiResponse.error(res, 500, "Error !!", error.message || error);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "removed from the group successfully...", data: null, error: null }
 *   - 403 Forbidden   : { success: false, statusCode: 403, message: "Only admin is supposed to remove the members", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const removeUserFromGroup = async(req,res)=>{
  let username = req.username;
  let groupId = req.params.groupId;
  let targetUsername = req.params.targetUsername;
  try {
    let group = await Group.findOne({_id : groupId});
    if(group.admin == username){
      let msg = await userExitFromGroup(targetUsername,groupId);
      return ApiResponse.success(res, 200, msg);
    } else {
      return ApiResponse.error(res, 403, "Only admin is supposed to remove the members");
    }
  } catch(error) {
    return ApiResponse.error(res, 400, error.message || "Error!!", error.message || error);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "Nickname changed successfully", data: null, error: null }
 *   - 403 Forbidden   : { success: false, statusCode: 403, message: "You can't change someone's profile", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const editProfile = async(req,res)=>{
  if(req.params.username != req.username){
    return ApiResponse.error(res, 403, "You can't change someone's profile");
  }
  let nickName = req.body.nickName;
  await User.updateOne(
    {username : req.username},
    {$set : {nickName : nickName}}
  );
  return ApiResponse.success(res, 200, "Nickname changed successfully");
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "User banned", data: null, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "User not found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const banUser = async(req,res)=>{
  let username = req.params.username;
  try {
    let user = await User.findOne({username}).select("-password");

    if(!user) {
      return ApiResponse.error(res, 404, "User not found");
    }

    for(let groupId of user.groups){
      await userExitFromGroup(user.username,groupId);
    }
    await user.deleteOne();
    return ApiResponse.success(res, 200, "User banned");
  } catch(error) {
    return ApiResponse.error(res, 500, "Error !!", error.message || error);
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
 *   - 200 OK        : { success: true, statusCode: 200, message: "NickName Changed Successfully", data: null, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "Error !!", data: null, error: "..." }
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
    return ApiResponse.success(res, 200, "NickName Changed Successfully");
  } catch (error) {
    return ApiResponse.error(res, 400, "Error !!", error.message);
  }
}