"use server";

import sgMail from "@sendgrid/mail";

import { env } from "@/env/server";

export async function sendEmail({
  to,
  subject,
  text,
}: {
  to: string;
  subject: string;
  text: string;
}) {
  sgMail.setApiKey(env.SENDGRID_API_KEY);

  const message = {
    to: to.toLowerCase().trim(),
    from: env.EMAIL_FROM,
    subject: subject.trim(),
    text: text.trim(),
  };

  try {
    const [response] = await sgMail.send(message);

    if (response.statusCode !== 202) {
      throw new Error(
        `SendGrid API returned status code ${response.statusCode}`
      );
    }

    return {
      success: true,
      messageId: response.headers["x-message-id"],
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }
}
