"use server";

import { Resend } from "resend";

import { env } from "@/env/server";

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const resend = new Resend(env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM, // e.g., "Your Company <noreply@yourdomain.com>"
      to: [to.toLowerCase().trim()], // Note: to should be an array
      subject: subject.trim(),
      text: text.trim(),
      html: html?.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      message: "Failed to send email. Please try again later.",
    };
  }
}
