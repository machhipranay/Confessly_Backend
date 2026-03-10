import { Developer } from "../models/Developer.js";
import { createToken } from "../service/devAuth.js";
import { devValidation } from "../validation/devValidation.js";

export const signupDeveloper = async (req, res) => {
  let { error } = devValidation.validate(req.body);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }

  let developer = await Developer.findOne({username : req.body.username});
  if (developer) {
    return res.status(404).json({ message: "Developer already exists" });
  }

  developer = new Developer(req.body);
  await developer
    .save()
    .then(() => {
      return res.status(200).json({ message: "New Developer Added" });
    })
    .catch(() => {
      return res
        .status(404)
        .json({ message: "Error Occured while adding developer!!!" });
    });
};

// url : /dev/login
export const loginDeveloper = async (req,res)=>{
  try {
    let developer = await Developer.findOne({username : req.body.username});
    if(developer){
      if(developer.password == req.body.password){
        let token = createToken(developer);
        req.header.token = token;
        return res.status(200).json({message : "Login Successful", token });
      }
      return res.status(404).json({message : "Password is incorrect"});
    } else {
      return res.status(404).json({ message: "Username is incorrect"});
    }
  } catch(err){
    return res.status(404).json({ message: "Some error occured!!!" , error : err.message});
  }
}

// url : /dev/logout
export const logoutDeveloper = async (req,res)=>{
  if(req.header.token){
    delete req.header.token;
  }
  return res.status(200).json({message : "Logged out successfully"});
}

export const removeDeveloper = async (req,res)=>{
  try{
    await Developer.deleteOne({username : req.params.username});
    return res.status(200).json({message : "dev removed"});
  }
  catch(error) {
    return res.stauts(404).json({message : "Error !!", error: error.message});
  }
}