import {Group} from '../models/Group.js';
import {User} from '../models/User.js';
import mongoose from 'mongoose';
import { ApiResponse } from '../utils/ApiResponse.js';

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Create New Group
 * URL         : /user/group/:name/create
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Creates a new group with the specified name. The requesting user 
 *               becomes the group admin and first member.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :name (string) - Name for the group
 * 
 * RETURNS     :
 *   - 200 OK        : { success: true, statusCode: 200, message: "New Group created successfully", data: null, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "Error!!", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const createGroup = async(req,res)=>{
  let admin = req.username;
  let name = req.params.name;
  let members = [admin];

  try {
      let group = new Group({admin, name, members});
      let user = await User.findOne({username : admin});
      user.groups.push(group._id);
      await user.save();
      await group.save();
      return ApiResponse.success(res, 200, "New Group created successfully");
    } catch (error) {
      return ApiResponse.error(res, 400, "Error!!", error.message || error);
    }
}

// Helper: Creates 6 length invite code valid for 1 hour duration
const generateInviteCode = ()=>{
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i = 0; i < 6; i++){
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Generate Group Invite Code (Admin Only)
 * URL         : /user/group/:groupId/inviteCode/generate
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication - Group Admin)
 * 
 * DESCRIPTION : Generates a random 6-character invitation code valid for 1 hour 
 *               allowing users to join the group.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :groupId (string) - MongoDB ObjectId of the group
 * 
 * RETURNS     :
 *   - 200 OK          : { success: true, statusCode: 200, message: "Invite code generated successfully", data: { inviteCode: "aB3x9Z" }, error: null }
 *   - 403 Forbidden   : { success: false, statusCode: 403, message: "only admin is allowed to generate this code", data: null, error: "..." }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "Group not found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getInviteCode = async (req,res)=>{
  try{

    const group = await Group.findById(req.params.groupId);
    if (!group) return ApiResponse.error(res, 404, "Group not found");
    if(group.admin != req.username){
      return ApiResponse.error(res, 403, "only admin is allowed to generate this code");
    }
  
    const code = generateInviteCode();
    group.inviteCode = code;
    group.inviteExpiry = Date.now() + 1000 * 60 * 60; // 1 hour validity
  
    await group.save();
    return ApiResponse.success(res, 200, "Invite code generated successfully", { inviteCode: code });
  } catch(error) {
    return ApiResponse.error(res, 400, "Error", error.message || error);
  }
};

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
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :inviteCode (string) - 6-character invite code
 * 
 * RETURNS     :
 *   - 200 OK          : { success: true, statusCode: 200, message: "Joined group successfully", data: null, error: null }
 *   - 400 Bad Request : { success: false, statusCode: 400, message: "Invite code expired" | "Already In Group", data: null, error: "..." }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "Invalid Invite code", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const joinGroup = async (req, res) => {
  const inviteCode = req.params.inviteCode;
  const username = req.username;

  try {
    const group = await Group.findOne({ inviteCode });

    if (!group) return ApiResponse.error(res, 404, "Invalid Invite code");
    
    if (group.inviteExpiry && Date.now() > group.inviteExpiry)
      return ApiResponse.error(res, 400, "Invite code expired");

    if (!group.members.includes(username)) {
      group.members.push(username);
      let user = await User.findOne({username});
      user.groups.push(group._id);
      await user.save();
      await group.save();
      return ApiResponse.success(res, 200, "Joined group successfully");
    } else {
      return ApiResponse.error(res, 400, "Already In Group");
    }
  } catch (err) {
    return ApiResponse.error(res, 400, "Error!!", err.message || err);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Search User's Joined Groups By Name
 * URL         : /user/search/group/:name
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Searches through the authenticated user's joined groups matching 
 *               the prefix name (case-insensitive).
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :name (string) - Prefix name pattern to search
 * 
 * RETURNS     :
 *   - 200 OK          : { success: true, statusCode: 200, message: "Groups found", data: { groups: [...] }, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "Groups not found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const searchGroupsByName= async(req,res)=>{
  let name = req.params.name;
  let username = req.username;
  try {
    const user = await User.findOne({username});
    if (!user || user.groups.length === 0) {
      return ApiResponse.error(res, 404, "Groups not found");
    }

    const groups = await Group.find({
      _id: { $in: user.groups },
      name: { $regex: `^${name}`, $options: "i" }, 
    });

    return ApiResponse.success(res, 200, "Groups found", { groups });
  } catch (error) {
    return ApiResponse.error(res, 400, "Error !!", error.message || error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Joined Groups For User
 * URL         : /user/group
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Returns list of group objects for all groups joined by authenticated user.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK        : { success: true, statusCode: 200, message: "Found Groups", data: { groups: [...] }, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "Error", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getGroups = async(req,res)=>{
  let username = req.username;
  try{
    let user = await User.findOne({username});
    let groups = user.groups;
    groups = await Promise.all(
      groups.map(id => Group.findOne({_id : id}))
    );
    return ApiResponse.success(res, 200, "Found Groups", { groups });
  } catch(error) {
    return ApiResponse.error(res, 400, "Error", error.message || error);
  }
}

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
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : :groupId (string) - MongoDB ObjectId of group
 * 
 * RETURNS     :
 *   - 200 OK        : { success: true, statusCode: 200, message: "removed from the group successfully...", data: null, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "Error !!", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const exitGroup = async (req,res)=>{
  let username = req.username;
  let groupId = req.params.groupId;
  
  try {
    let message = await userExitFromGroup(username,groupId);
    return ApiResponse.success(res, 200, message);
  } catch (error) {
    return ApiResponse.error(res, 400, "Error !!", error.message || error);
  }
};

/**
 * -----------------------------------------------------------------------------
 * HELPER      : Internal Function - User Exit From Group
 * DESCRIPTION : Helper function that removes a user from a group's members array 
 *               and the group ID from the user's groups array. Handles admin exit logic.
 * -----------------------------------------------------------------------------
 */
export const userExitFromGroup = async(username,groupId)=>{
    let user = await User.findOne({username});
    let idx = user.groups.findIndex(id => id.toString() == groupId);
    if(idx == -1){
      return "User is not in the group"; 
    }
    let group = await Group.findOne({_id : groupId});
    if(group.admin == username && group.members.length > 1) {
      throw new Error("Remove all the members before leaving the group!!");
    }
    user.groups.splice(idx,1);
    idx = group.members.indexOf(username);
    group.members.splice(idx,1);
    if(group.admin == username){
      await group.deleteOne();
    }
    await user.save();
    return "removed from the group successfully...";
}