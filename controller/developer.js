import { Developer } from "../models/Developer.js";
import { createToken } from "../service/devAuth.js";
import { compareInput, hashInput } from "../utils/bcrypt.js";
import { devValidation } from "../validation/devValidation.js";

export const signupDeveloper = async (req, res) => {
  const payload = {
    username : req.body.username,
    password : req.body.password
  }
  let { error } = devValidation.validate(payload);
  if (error) {
    return res.status(404).json({ message: error.details[0].message });
  }

  let developer = await Developer.findOne({username : req.body.username}).select("-password");
  if (developer) {
    return res.status(404).json({ message: "Developer already exists" });
  }

  payload.password = await hashInput(req.body.password);

  developer = new Developer(payload);
  await developer
    .save()
    .then(() => {
      return res.status(200).json({ message: "New Developer Added" });
    })
    .catch((err) => {
      return res
        .status(404)
        .json({ message: "Error Occured while adding developer!!!", error : err});
    });
};

// url : /dev/login
export const loginDeveloper = async (req,res)=>{
  try {
    let developer = await Developer.findOne({username : req.body.username});
    if(developer){
      if(compareInput(req.body.password,developer.password)){
        let token = createToken({username : developer.username});
        return res.status(200).json({message : "Login Successful As Developer", token });
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