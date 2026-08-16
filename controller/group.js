import {Group} from '../models/Group.js';
import {User} from '../models/User.js';
import mongoose from 'mongoose';

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
 *   - 200 OK        : { message: "New Group created successfully" }
 *   - 404 Not Found : { message: "Error!!", error: <error_message> }
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
      await group.save().then(()=>{
        return res.status(200).json({message : "New Group created successfully"});
      })
      .catch((error)=>{
        return res.status(404).json({message : "Error!!", error: error.message});
      });
    } catch (error) {
      res.status(404).json({message : "Error!!", error});
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
 *   - 200 OK          : { inviteCode: "aB3x9Z" }
 *   - 400 Bad Request : { message: "only admin is allowed to generate this code" }
 *   - 404 Not Found   : { message: "Group not found" | "Error", error }
 * -----------------------------------------------------------------------------
 */
export const getInviteCode = async (req,res)=>{
  try{

    const group = await Group.findById(req.params.groupId);
    if(group.admin != req.username){
      return res.status(400).json({message : "only admin is allowed to generate this code"});
    }
    if (!group) return res.status(404).send("Group not found");
  
    const code = generateInviteCode();
    group.inviteCode = code;
    group.inviteExpiry = Date.now() + 1000 * 60 * 60; // 1 hour validity
  
    await group.save();
    res.json({ inviteCode: code });
  } catch(error) {
    return res.status(404).json({message : "Error", error: error.message});
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
 *   - 200 OK          : { message: "Joined group successfully" }
 *   - 400 Bad Request : { message: "Invite code expired" | "Already In Group" }
 *   - 404 Not Found   : { message: "Invalid Invite code" | "Error!!", error }
 * -----------------------------------------------------------------------------
 */
export const joinGroup = async (req, res) => {
  const inviteCode = req.params.inviteCode;
  const username = req.username;

  try {
    const group = await Group.findOne({ inviteCode });

    if (!group) return res.status(404).json({ message: "Invalid Invite code" });
    
    if (group.inviteExpiry && Date.now() > group.inviteExpiry)
      return res.status(400).send("Invite code expired");

    if (!group.members.includes(username)) {
      group.members.push(username);
      let user = await User.findOne({username});
      user.groups.push(group._id);
      await user.save();
      await group.save();
      return res.status(200).json({ message: "Joined group successfully" });
    } else {
      return res.status(400).json({ message: "Already In Group" });
    }
  } catch (err) {
    return res.status(404).json({ message: "Error!!", error: err.message });
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
 *   - 200 OK          : { message: "Groups found", groups: [ ... ] }
 *   - 400 Bad Request : { message: "Groups not found", groups: [] }
 *   - 404 Not Found   : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
export const searchGroupsByName= async(req,res)=>{
  let name = req.params.name;
  let username = req.username;
  try {
    const user = await User.findOne({username});
    if (!user || user.groups.length === 0) {
      return res.status(400).json({ message : "Groups not found" , groups : []});
    }

    const groups = await Group.find({
      _id: { $in: user.groups },
      name: { $regex: `^${name}`, $options: "i" }, 
    });

    return res.status(200).json({message : "Groups found", groups});
  } catch (error) {
    return res.status(404).json({message : "Error !!", error :error.message});
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
 *   - 200 OK        : { message: "Found Groups", groups: [ ... ] }
 *   - 404 Not Found : { message: "Error", error }
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
    return res.status(200).json({message : "Found Groups", groups});
  } catch(error) {
    return res.status(404).json({message : "Error", error : error.message});
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
 *   - 200 OK        : { message: "removed from the group successfully..." }
 *   - 404 Not Found : { message: "Error !!", error }
 * -----------------------------------------------------------------------------
 */
export const exitGroup = async (req,res)=>{
  let username = req.username;
  let groupId = req.params.groupId;
  
  try {
    let message = await userExitFromGroup(username,groupId);
    return res.status(200).json({message : message});
  } catch (error) {
    return res.status(404).json({message : "Error !!", error: error.message});
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