const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL || "geminih1301@gmail.com"    ,
    pass: process.env.PASSWORD || "hvdk ljim yulj xskr",
  },
});

exports.sendMail = async(receiverEmail,subject,body) => {
    if (!process.env.EMAIL || !process.env.PASSWORD) {
        console.error("Email credentials are not set in environment variables. Cannot send email.");
        throw new Error("Email service not configured.");
    }
    await transporter.sendMail({
    from: process.env.EMAIL,
    to: receiverEmail,
    subject: subject,
    html: body
  });
};
