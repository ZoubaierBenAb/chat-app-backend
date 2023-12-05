import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
    },
    avatar: {
      type: String,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      validate: {
        validator: function (email) {
          // an anonymous function that returns a Boolean
          return String(email)
            .toLowerCase()
            .match(
              /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
        },
        message: (props) => `Email (${props.value}) is Invalid`, // props.value is the actual value typed by the user
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
    },
    otp_expiry_time: {
      type: Date,
    },
    socket_id : {
      type : String,
    },
    friends : [
      {
        type : mongoose.Schema.ObjectId,
        ref : 'User'
      }
    ],
    status : {
      type : String,
      enum : ['Online,Offline']
    }
  },
  { timestamps: true }
);


// a hook that hashes the OTP before saving it in the user Document 
userSchema.pre("save", async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified("otp") || !this.otp) return next();

  // Hash the otp with cost of 12
  this.otp = await bcrypt.hash(this.otp.toString(), 12);

  

  next();
});


// a hook that hashes the password before saving it in the user document 
userSchema.pre('save',async function (next){

  if (!this.isModified('password') || !this.password) return next();

  this.password = await bcrypt.hash(String(this.password),12)
  
  next()

})
// Defines a method for securely comparing a candidate password with a user's hashed password.you can accees it in the user document object
userSchema.methods.comparePassword = async function (
  candidatePassword, // inputed password by the user
  userPassword // hashed password stored in the database
) {
  return await bcrypt.compare(candidatePassword, userPassword); // returns a boolean
};

userSchema.methods.compareOTP = async function (
  candidateOTP, // inputed OTP by the user
  userOTP // hashed OTP stored in the database
) {
  if(candidateOTP === userOTP) return true;; // returns a boolean
};
//Defines a method that create a Token and saves it in the document
userSchema.methods.createPasswordResetToken = async function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
    this.passwordResetExpires = Date.now() + 10*60*1000

  return resetToken;
};

userSchema.methods.changedPasswordAfter = async function (timestamp){
return timestamp < this.passwordChangedAt
}


export const User = new mongoose.model("User", userSchema);
