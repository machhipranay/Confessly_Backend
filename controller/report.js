import { Chat } from "../models/Chat.js";
import { Report } from "../models/Report.js";
import { deleteChat } from "./chat.js";
import { reportValidation} from "../validation/reportValidation.js"
import { ApiResponse } from "../utils/ApiResponse.js";

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
 *   - 200 OK        : { success: true, statusCode: 200, message: "Reported Successfully", data: null, error: null }
 *   - 400 Bad Req   : { success: false, statusCode: 400, message: "...", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const createReport = async (req, res) => {
  req.body.chatId = req.params.chatId;
  req.body.reporter = req.username;
  let { error } = await reportValidation.validate(req.body);
  if (error) {
    return ApiResponse.error(res, 400, error.details[0].message, error.details[0].message);
  }
  let report = new Report(req.body);
  await report
    .save()
    .then(() => {
      return ApiResponse.success(res, 200, "Reported Successfully");
    })
    .catch((err) => {
      return ApiResponse.error(res, 400, "Error!!", err.message || err);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "deleted successfully", data: null, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "report doesnot exists", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const actionReport = async (req, res) => {
  let reportId = req.params.reportId;
  try {
    let report = await Report.findOne({ _id: reportId });
    if (!report) {
      return ApiResponse.error(res, 404, "report doesnot exists");
    }
    let chatId = report.chatId;
    let devUsername = req.username;

    let result = await deleteChat(chatId, "developer");

    await Report.updateMany(
      { chatId: chatId },
      { $set: { status: "action_taken", reviewedBy: devUsername } }
    );

    return ApiResponse.success(res, 200, result.message || "Action taken successfully");

  } catch (err) {
    return ApiResponse.error(res, 404, "report doesnot exists", err.message || err);
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
 *   - 200 OK          : { success: true, statusCode: 200, message: "report dismissed", data: null, error: null }
 *   - 404 Not Found   : { success: false, statusCode: 404, message: "report doesnot exists", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const dismissReport = async (req, res) => {
  let reportId = req.params.reportId;
  let devUsername = req.username;
  try {
    const result = await Report.updateOne(
      { _id: reportId },
      { $set: { status: "dismissed", reviewedBy : devUsername } }
    );
    if (result.matchedCount === 0) {
      return ApiResponse.error(res, 404, "report doesnot exists");
    }
    return ApiResponse.success(res, 200, "report dismissed");
  } catch (err) {
    return ApiResponse.error(res, 404, "report doesnot exists", err.message || err);
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
 *   - 200 OK        : { success: true, statusCode: 200, message: "Result found", data: { reports: [...] }, error: null }
 *   - 404 Not Found : { success: false, statusCode: 404, message: "No reports found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getPendingReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "pending" });
        return ApiResponse.success(res, 200, "Result found", { reports });
    } catch (err) {
        return ApiResponse.error(res, 404, "No reports found", err.message || err);
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
 *   - 200 OK        : { success: true, statusCode: 200, message: "Result found", data: { reports: [...] }, error: null }
 *   - 404 Not Found : { success: false, statusCode: 404, message: "No reports found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getDismissedReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "dismissed" });
        return ApiResponse.success(res, 200, "Result found", { reports });
    } catch (err) {
        return ApiResponse.error(res, 404, "No reports found", err.message || err);
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
 *   - 200 OK        : { success: true, statusCode: 200, message: "Result found", data: { reports: [...] }, error: null }
 *   - 404 Not Found : { success: false, statusCode: 404, message: "No reports found", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const getActionTakenReports = async(req,res)=>{
    try {
        let reports = await Report.find({ status : "action_taken" });
        return ApiResponse.success(res, 200, "Result found", { reports });
    } catch (err) {
        return ApiResponse.error(res, 404, "No reports found", err.message || err);
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
 *   - 200 OK        : { success: true, statusCode: 200, message: "Report Content...", data: { responce }, error: null }
 *   - 404 Not Found : { success: false, statusCode: 404, message: "Error!!", data: null, error: "..." }
 * -----------------------------------------------------------------------------
 */
export const viewReport = async(req,res)=>{
  let reportId = req.params.reportId;
  try {
    let report = await Report.findOne({ _id : reportId });
    if (!report) {
      return ApiResponse.error(res, 404, "Report not found");
    }
    let chat = await Chat.findOne({ _id :report.chatId });
    let responce = {
      _id : reportId,
      reportedUser : chat ? chat.from : "Unknown",
      reporter : report.reporter,
      chatContent : chat ? chat.content : "Chat deleted or unavailable",
      reason : report.reason,
      description : report.description,
      createdAt : report.createdAt
    }
    return ApiResponse.success(res, 200, "Report Content...", responce);
  } catch(error) {
    return ApiResponse.error(res, 404, "Error!!", error.message);
  }
}
