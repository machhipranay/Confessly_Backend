import express from 'express';
import cors from 'cors';
// import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import {signupUser, loginUser, findUser,followUser,unfollowUser, logoutUser, getUser, banUser, deleteChatBySender, removeUserFromGroup, editProfile, changeNickName, getSelfProfile} from './controller/user.js'
import { userAuthMiddleware } from './service/userAuth.js';
import { loginDeveloper, signupDeveloper, logoutDeveloper} from './controller/developer.js';
import { devAuthMiddleware } from './service/devAuth.js';
import { createGroup, exitGroup, getGroups, getInviteCode, joinGroup, searchGroupsByName } from './controller/group.js';
import { actionReport, dismissReport, getActionTakenReports,getPendingReports, getDismissedReports, viewReport, createReport } from './controller/report.js';
import { createNewChat, getChatsOfGroup } from './controller/chat.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname,'/public')));

mongoose.connect(process.env.MONGO_URL)
.then(()=>{
  app.listen(process.env.PORT, ()=>{
      console.log("Server is listening on port : ", process.env.PORT);
  });
  console.log("Database connected");
})
.catch(()=>{
  console.log("Some error occured while connecting database");
})

// developer routes ----------------------------------------------------
app.post('/dev/login', loginDeveloper);
app.post('/dev/signup', signupDeveloper); // recently not used
app.get('/dev/logout', logoutDeveloper);
app.get('/dev/user/:username/ban',devAuthMiddleware,banUser);

// reports handling
app.get('/dev/reports/:reportId/actionTaken',devAuthMiddleware,actionReport);
app.get('/dev/reports/:reportId/dismiss',devAuthMiddleware,dismissReport);
app.get('/dev/reports/pending',devAuthMiddleware,getPendingReports);
app.get('/dev/reports/actionTaken',devAuthMiddleware,getActionTakenReports);
app.get('/dev/reports/dismissed',devAuthMiddleware,getDismissedReports);
app.get('/dev/reports/:reportId/view',devAuthMiddleware,viewReport);

// user routers ----------------------------------------------------
app.post('/user/signup',signupUser);
app.post('/user/login', loginUser);
app.get('/user/:input/find', findUser);
app.get('/user/profile',userAuthMiddleware ,getSelfProfile);
app.get('/user/:username/profile',userAuthMiddleware,getUser);
app.get('/user/edit/:nickName',userAuthMiddleware,changeNickName);
app.get('/user/:username/follow',userAuthMiddleware,followUser);
app.get('/user/:username/unfollow',userAuthMiddleware,unfollowUser);
app.get('/user/logout',userAuthMiddleware,logoutUser); 
app.get('/user/group/:groupId/:targetUsername/remove',userAuthMiddleware,removeUserFromGroup);

// action on groups
app.get('/user/group/:name/create',userAuthMiddleware,createGroup);
app.get('/user/group/:groupId/inviteCode/generate',userAuthMiddleware,getInviteCode);
app.get('/user/group/:inviteCode/join',userAuthMiddleware,joinGroup);
app.get('/user/search/group/:name',userAuthMiddleware,searchGroupsByName);
app.get('/user/group',userAuthMiddleware,getGroups);
app.get('/user/group/:groupId/exit',userAuthMiddleware,exitGroup);

// action on chat
app.post('/user/group/:groupId/chat/new',userAuthMiddleware,createNewChat); // working till here
app.get('/user/group/:groupId/chat/:chatId/delete',userAuthMiddleware,deleteChatBySender);
app.get('/user/group/:groupId/chat',userAuthMiddleware,getChatsOfGroup);

// action on report
app.post('/user/group/:groupId/chat/:chatId/report',userAuthMiddleware,createReport);

app.get('/{*any}',(req,res)=>{
  res.status(200).json({message : "This is global get page"});
});

app.post('/{*any}',(req,res)=>{
  res.status(200).json({message : "This is global post page"});
});