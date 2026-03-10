import Joi from "joi";
import mongoose from "mongoose";

export const chatValidation = Joi.object({
  content: Joi.string().required(),

  from: Joi.string().allow("").default(""),

  isConfession: Joi.boolean().default(false),

  group: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    }, "ObjectId Validation"),

  timestamp: Joi.date().default(Date.now)
  
});