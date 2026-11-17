import { config } from '../config/env.js';

export async function sendPasswordResetEmail(to, code) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.resendFromEmail,
      to: [to],
      subject: 'Your RetailFlow password reset code',
      text: `Your RetailFlow verification code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
      html: `<p>Your RetailFlow verification code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>It expires in 10 minutes. If you did not request this, ignore this email.</p>`
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!response.ok) {
    const error = new Error('Resend rejected the password reset email');
    error.status = response.status;
    throw error;
  }
}
