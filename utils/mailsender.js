// utils/mailSender.js
import nodemailer from 'nodemailer';

export const sendEmail = async (to, subject, html) => {
  try {
    // Transporter setup using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER, // your Gmail
        pass: process.env.MAIL_PASS, // your App Password (not Gmail password)
      },
    });

    const mailOptions = {
      from: `"OTP Service" <${process.env.MAIL_USER}>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error("Error sending mail", error);
    throw error;
  }
};
