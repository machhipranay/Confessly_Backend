import bcrypt from "bcrypt";

export const hashInput = async (input) => {
  const salt = await bcrypt.genSalt(10);
  const hashedInput = await bcrypt.hash(input, salt);
  return hashedInput;
};

export const compareInput = async (input, hashedInput) => {
  return await bcrypt.compare(input, hashedInput);
};