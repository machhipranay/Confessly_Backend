/**
 * Standardized API Response Helper Class
 */
export class ApiResponse {
  /**
   * Send a successful API response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {string} message - Success summary message
   * @param {Object|Array|null} data - Data payload (default: null)
   */
  static success(res, statusCode = 200, message = "Success", data = null) {
    return res.status(statusCode).json({
      success: true,
      statusCode,
      message,
      data,
      error: null
    });
  }

  /**
   * Send an error API response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 400)
   * @param {string} message - Error summary message
   * @param {Object|string|null} error - Specific error details (default: null)
   */
  static error(res, statusCode = 400, message = "Error", error = null) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      data: null,
      error: error || message
    });
  }
}
