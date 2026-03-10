import Joi from "joi";
import mongoose from "mongoose";

export const groupValidation = Joi.object({
  name: Joi.string().required(),

  members: Joi.array()
    .items(Joi.string())
    .default([]),

  admin: Joi.string().allow("").default(""),

  chats: Joi.array()
    .items(
      Joi.string().custom((value, helpers) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          return helpers.error("any.invalid");
        }
        return value;
      }, "ObjectId Validation")
    )
    .default([])
});