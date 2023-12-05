import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import { filterObj } from "../utils/filterObj.js";
import otpGenerator from "otp-generator";
import crypto from "crypto";
import { promisify } from "util";
import { sendEmail } from "../services/mailer.js";
import { reset_password } from "../templates/email/reset-password.js";

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

export const login = async (req, res, next) => {
  const { email, password } = req.body;

  // console.log(email, password);

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
    return;
  }

  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !user.password) {
    res.status(400).json({
      status: "error",
      message: "Incorrect password",
    });

    return;
  }

  if (!user || !(await user.comparePassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or password is incorrect",
    });

    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully!",
    token,
    user_id: user._id,
  });
};

export const register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filtredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "email"
  );
  // check if a verified user with given email exists
  const userExists = await User.findOne({ email });

  if (userExists && userExists.verified) {
    res.status(400).json({
      message: "Email is already used",
    });
  } else if (userExists) {
    await User.findOneAndUpdate({ email: email }, filtredBody, {
      new: true,
      validateModifiedOnly: true,
    });
    req.userId = userExists._id;
    next();
  } else {
    //if user record is not available in DB
    const new_user = await User.create(filtredBody);
    // generate OTP and send email to user

    req.userId = new_user._id;
    next();
  }
};

export const sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });
  const otp_expiry_time = Date.now() + 10 * 60 * 1000; // 10 mins after otp is sent

  const user = await User.findByIdAndUpdate(userId, {
    otp: new_otp,
    otp_expiry_time,
  });
  // send Email to the user
  sendEmail({
    from: "zoubairbenab9779@gmail.com", // the email has to be verified by the sendGrid
    to: user.email, // has to be the email of the user
    subject: "OTP for CHITCHAT",
    text: `your OTP ${new_otp}`,
    html: `<h1>OTP${new_otp}</h1>`,
    attachments: [],
  });
  console.log(user.email);

  res.status(200).json({
    message: "OTP sent successfully",
    
  });
};

export const verifyOtp = async (req, res, next) => {
  // verify otp and update user accordingly
  const { email, otp } = req.body;
  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
  }

  if (user.verified) {
    return res.status(400).json({
      status: "error",
      message: "Email is already verified",
    });
  }

  if (!(await user.compareOTP(otp, user.otp))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });

    return;
  }

  // OTP is correct

  user.verified = true;
  user.otp = undefined;
  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified Successfully!",
    token,
    user_id: user._id,
  });
};

export const forgotPassword = async (req, res, next) => {
  // get user email

  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(404).json({
      message: "user doesn't exist",
    });

    return;
  }

  // create a random reset token
  const resetToken =await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  
  try {
    const resetUrl = `http://localhost:3000/auth/new-password/?token=${resetToken}`;
    
    sendEmail({
      from: "zoubairbenab9779@gmail.com", // the email has to be verified by the sendGrid
      to: user.email, // has to be the email of the user
      subject: "Reset your CHITCHAT password",
      html: reset_password(user.firstName,resetUrl),
      attachments: [],
    });
    res.status(200).json({
      message: "Reset Password link sent to Email",
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(500).json({
      message: "There was an error,please try again later",
    });
  }
};

export const resetPassword = async (req, res, next) => {
  // Get user Based on token

  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // =if token has expired or token is invalid
  if (!user) {
    res.status(400).json({
      message: "Token is invalid or expired",
    });

    return;
  }
  // update user passwerd and reset token and expiry to undefined
  user.password = req.body.password;
  user.passwordConfirm = req.body.confirmPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  // Login the user and send token

  const token = signToken(user._id);

  res.status(200).json({
    message: "Password reseted successfully",
    token,
    user_id : user._id
  });
};

export const protect = async (req, res, next) => {
  // getting the token and check if it's there

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }
  if (!token) {
    return res.status(401).json({
      message: "You are not logged in! Please log in to get access.",
    });
  }

  // token verification

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if user still exist

  const user = await User.findById(decoded.userId);

  if (!user) {
    res.status(400).json({
      message: "User doesn't exist",
    });
  }

  // check if user changed their password after token was issued

 
  req.user = user;

  next();
};
