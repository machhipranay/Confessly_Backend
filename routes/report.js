import express from 'express';
import { 
  createReport, 
  actionReport, 
  dismissReport, 
  getPendingReports, 
  getActionTakenReports, 
  getDismissedReports, 
  viewReport 
} from '../controller/report.js';
import { devAuthMiddleware } from '../service/devAuth.js';
import { userAuthMiddleware } from '../service/userAuth.js';

const router = express.Router();

// =============================================================================
// REPORT ACTIONS ROUTES
// =============================================================================

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Submit Report For Chat Message
 * URL         : /user/group/:groupId/chat/:chatId/report
 * METHOD TYPE : POST
 * AUTH        : Bearer Token Required (User Authentication)
 * 
 * DESCRIPTION : Flags a chat message for moderation by submitting a report to developers.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <user_jwt_token>
 *   - Params           : 
 *       - :groupId (string) : MongoDB ObjectId of group
 *       - :chatId (string)  : MongoDB ObjectId of chat message
 *   - Body (JSON):
 *       - reason (string) [Required]      : One of ["spam", "harassment", "hate_speech", "nudity", "other"]
 *       - description (string) [Optional] : Additional explanation details
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Reported Successfully" }
 *   - 404 Not Found    : { message: "Error!!" | validation error }
 * -----------------------------------------------------------------------------
 */
router.post('/user/group/:groupId/chat/:chatId/report', userAuthMiddleware, createReport);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Take Action On Report (Delete Reported Chat)
 * URL         : /dev/reports/:reportId/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Approves action on a report. Deletes/redacts the reported chat content 
 *               and updates the status of all reports associated with that chat to 'action_taken'.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "deleted successfully" }
 *   - 400 Bad Request  : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/:reportId/actionTaken', devAuthMiddleware, actionReport);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Dismiss Report
 * URL         : /dev/reports/:reportId/dismiss
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Marks a reported item as reviewed and dismissed without altering the chat message.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "report dismissed" }
 *   - 400 Bad Request  : { message: "report doesnot exists" }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/:reportId/dismiss', devAuthMiddleware, dismissReport);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Pending Reports
 * URL         : /dev/reports/pending
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all user reports with status 'pending' awaiting dev review.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/pending', devAuthMiddleware, getPendingReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Action-Taken Reports
 * URL         : /dev/reports/actionTaken
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all user reports that have been resolved with action taken.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/actionTaken', devAuthMiddleware, getActionTakenReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : Get All Dismissed Reports
 * URL         : /dev/reports/dismissed
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Retrieves a list of all reports that were reviewed and dismissed by developers.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Result found", reports: [ ... ] }
 *   - 404 Not Found    : { message: "No reports found" }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/dismissed', devAuthMiddleware, getDismissedReports);

/**
 * -----------------------------------------------------------------------------
 * ROUTE       : View Detailed Report Information
 * URL         : /dev/reports/:reportId/view
 * METHOD TYPE : GET
 * AUTH        : Bearer Token Required (Developer Authorization)
 * 
 * DESCRIPTION : Fetches complete detail for a specific report including reported user, 
 *               reporter, reason, description, and raw chat content.
 * 
 * DATA REQUIRED:
 *   - Headers          : Authorization: Bearer <dev_jwt_token>
 *   - Params           : :reportId (string) - MongoDB ObjectId of the report
 * 
 * RETURNS     :
 *   - 200 OK           : { message: "Report Content...", responce: { _id, reportedUser, reporter, chatContent, reason, description, createdAt } }
 *   - 404 Not Found    : { message: "Error!!", error: <error_message> }
 * -----------------------------------------------------------------------------
 */
router.get('/dev/reports/:reportId/view', devAuthMiddleware, viewReport);

export default router;
