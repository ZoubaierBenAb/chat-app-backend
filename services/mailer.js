import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();
sgMail.setApiKey(process.env.SG_KEY);

const sendSgMail = async ({
  to,
  sender,
  subject,
  html,
  text,
  attachments,
}) => {
  try {
    const from = sender || "zoubairbenab9779@gmail.com";

    const msg = {
      to, // email of the recipient
      from, // our verified sender
      subject,
      html,
      text,
      attachments,
    };

    return sgMail.send(msg); // returns a promise , will be able .then .catch in the controller
  } catch (error) {
    console.log(error);
  }
};

export const sendEmail = async (args) => {
  if (!process.env.NODE_ENV === "development") {
    return Promise.resolve(); // creates a promise that is fulfilled immediately
  } else {
    return sendSgMail(args);
  }
};
