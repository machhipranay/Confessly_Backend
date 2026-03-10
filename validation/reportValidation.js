import Joi from "joi";
import mongoose from "mongoose";

export const reportValidation = Joi.object({
  reporter: Joi.string().optional(),

  reportedUser: Joi.string().optional(),

  chatId: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "ObjectId Validation")
    .required(),

  reason: Joi.string()
    .valid("spam", "harassment", "hate_speech", "nudity", "other")
    .required(),

  description: Joi.string().allow("").default(""),

  status: Joi.string()
    .valid("pending", "action_taken", "dismissed")
    .default("pending"),

  reviewedBy: Joi.string().allow("").default(""),

  createdAt: Joi.date().default(() => new Date())
});
