import { Chat } from "../models/Chat.js";
import { Report } from "../models/Report.js";
import { deleteChat } from "./chat.js";
import { reportValidation} from "../validation/reportValidation.js"

// url : /user/group/:groupId/chat/:chatId/report
export const createReport = async (req, res) => {
  req.body.chatId = req.params.chatId;
  req.body.reporter = req.username;
  let { error } = await reportValidation.validate(req.body);
  if (error) {
    res.status(404).json({ message: error.details[0].message });
  }
  let report = new Report(req.body); // make it manually;
  await report
    .save()
    .then(() => {
      res.status(200).json({ message: "Reported Successfully" });
    })
    .catch(() => {
      res.status(404).json({ message: "Error!!" });
    });
};

// url : /dev/reports/:reportId/actionaken
export const actionReport = async (req, res) => {
  let reportId = req.params.reportId;
  try {
    let report = await Report.findOne({ _id: reportId });
    let chatId = report.chatId;
    let devUsername = req.username;

    let responce = await deleteChat(chatId, "developer");

    await Report.updateMany(
      { chatId: chatId },
      { $set: { status: "action_taken", reviewedBy: devUsername } }
    );

    return res.status(200).json(responce);

  } catch (err) {
    res.status(400).json({ message: "report doesnot exists" });
  }
};

// url : /dev/reports/:reportId/dismiss
export const dismissReport = async (req, res) => {
  let reportId = req.params.reportId;
  let devUsername = req.username;
  try {
    await Report.updateOne(
      { _id: reportId },
      { $set: { status: "dismissed", reviewedBy : devUsername } }
    );
    res.status(200).json({message : "report dismissed"});
  } catch (err) {
    res.status(400).json({ message: "report doesnot exists" });
  }
};

// url : /dev/reports/pending
export const getPendingReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "pending" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

// url : /dev/reports/dismissed
export const getDismissedReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "dismissed" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

// url : /dev/reports/actionTaken
export const getActionTakenReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "action_taken" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

// url : /dev/report/:reportId/view
export const viewReport = async(req,res)=>{
  let reportId = req.params.reportId;
  try {
    let report = await Report.findOne({ _id : reportId });
    let chat = await Chat.findOne({ _id :report.chatId });
    let responce = {
      _id : reportId,
      reportedUser : chat.from,
      reporter : report.reporter,
      chatContent : chat.content,
      reason : report.reason,
      description : report.description,
      createdAt : report.createdAt
    }
    return res.status(200).json({message : "Report Content...", responce});
  } catch(error) {
    return res.status(404).json({message : "Error!!", error : error.message} );
  }
}
