import joi from "joi";

export const devValidation = joi.object({
  username: joi.string()
    .pattern(/^[a-z]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Username must contain only lowercase letters',
      'string.empty': 'Username is required',
    }),
    
    password: joi
    .string()
    .min(6)
    .pattern(new RegExp("^(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*])"))
    .required()
    .messages({
      "string.min": "Password must be at least 6 characters long.",
      "string.pattern.base":
      "Password must contain at least one uppercase letter, one number, and one special character.",
      'string.empty': 'Passowrd is required',
    }),
});