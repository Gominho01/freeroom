import nodemailer from "nodemailer";

// No real SMTP is configured for this project — the JSON transport never
// touches the network, it just validates the message shape and hands it
// back, so this is safe to call from tests and dev alike. Swapping in a
// real provider later is a one-line change here, nothing else moves.
const transport = nodemailer.createTransport({ jsonTransport: true });

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  const info = await transport.sendMail({ from: "SalaLivre <no-reply@salalivre.dev>", ...message });
  console.log(`[dev email] to ${message.to} — ${message.subject}\n${info.message}`);
}
