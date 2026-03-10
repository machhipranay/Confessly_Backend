import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  reporter: {
    type: String,
    // required: true,
  },

  reportedUser: {
    type: String,
    // required: true,
  },

  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  reason: {
    type: String,
    enum: ["spam", "harassment", "hate_speech", "nudity", "other"],
    required: true,
  },

  description: {
    type: String,
    default : "",
  },

  status: {
    type: String,
    enum: ["pending","action_taken", "dismissed"],
    default: "pending",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  reviewedBy: {
    type: String,
    default : "",
  }

});

export const Report = mongoose.model("Report", reportSchema);