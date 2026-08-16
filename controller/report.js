import { Chat } from "../models/Chat.js";
import { Report } from "../models/Report.js";
import { deleteChat } from "./chat.js";
import { reportValidation} from "../validation/reportValidation.js"

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Create / Submit Report For Chat Message
 * URL         : /user/group/:groupId/chat/:chatId/report
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Submits a user report flagging a specific chat message for developer review.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <user_jwt_token>
 *   - Params  : 
 *       - :groupId (string) : MongoDB ObjectId of group
 *       - :chatId (string)  : MongoDB ObjectId of chat message
 *   - Body (JSON):
 *       - reason (string) [Required]      : One of ["spam", "harassment", "hate_speech", "nudity", "other"]
 *       - description (string) [Optional] : Detailed explanation of report
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "Reported Successfully" }
 *   - 404 Not Found : { message: "Error!!" | validation error }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Take Action On Report (Delete Reported Chat)
 * URL         : /dev/reports/:reportId/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Resolves report by soft deleting/redacting the reported chat message 
 *               and setting report status to 'action_taken'.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 *   - Params  : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "deleted successfully" }
 *   - 400 Bad Request : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Dismiss Report
 * URL         : /dev/reports/:reportId/dismiss
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Dismisses a report by setting its status to 'dismissed' without deleting chat.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 *   - Params  : :reportId (string) - MongoDB ObjectId of report
 * 
 * RETURNS     :
 *   - 200 OK          : { message: "report dismissed" }
 *   - 400 Bad Request : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
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

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Pending Reports List
 * URL         : /dev/reports/pending
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Fetches all reports with status 'pending' awaiting developer action.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
export const getPendingReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "pending" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Dismissed Reports List
 * URL         : /dev/reports/dismissed
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Fetches all reports marked as 'dismissed'.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
export const getDismissedReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "dismissed" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get Action-Taken Reports List
 * URL         : /dev/reports/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Fetches all reports resolved with status 'action_taken'.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
export const getActionTakenReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "action_taken" });
        return res.status(200).json({message : "Result found", reports});
    } catch (err) {
        return res.status(404).json({message : "No reports found"});
    }
}

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : View Detailed Report Info
 * URL         : /dev/reports/:reportId/view
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves details of a specific report including reported user, 
 *               reporter, message content, reason, description, and creation time.
 * 
 * DATA REQUIRED:
 *   - Headers : Authorization: Bearer <dev_jwt_token>
 *   - Params  : :reportId (string) - MongoDB ObjectId of report
 * 
 * RETURNS     :
 *   - 200 OK        : { message: "Report Content...", responce: { _id, reportedUser, reporter, chatContent, reason, description, createdAt } }
 *   - 404 Not Found : { message: "Error!!", error }
 * -----------------------------------------------------------------------------
 */
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
