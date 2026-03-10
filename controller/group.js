import {Group} from '../models/Group.js';
import {User} from '../models/User.js';
import mongoose from 'mongoose';

// url : /user/group/:name/create
export const createGroup = async(req,res)=>{
  console.log("got here");
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

// creates 6 length invite code with 1 hour duration
const generateInviteCode = ()=>{
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for(let i = 0; i < 6; i++){
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// url : /user/group/:groupId/inviteCode/generate
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

// url : /user/group/:inviteCode/join
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

// url : /user/search/group/:name
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

// url : /user/group/:groupId/exit
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

// function which removes user from group
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