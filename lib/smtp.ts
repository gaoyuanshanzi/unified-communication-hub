import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export const DEFAULT_SMTP_PROVIDERS: Record<
  string,
  { host: string; port: number; secure: boolean }
> = {
  kakao: {
    host: "smtp.daum.net",
    port: 465,
    secure: true,
  },
  naver: {
    host: "smtp.naver.com",
    port: 465,
    secure: true,
  },
  gmail: {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
  },
};

export async function sendMail(
  config: SmtpConfig,
  mailOptions: {
    from?: string;
    to: string;
    cc?: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: MailAttachment[];
  }
) {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass,
    },
  });

  const fromAddress = mailOptions.from || config.auth.user;

  const info = await transporter.sendMail({
    from: fromAddress,
    to: mailOptions.to,
    cc: mailOptions.cc,
    subject: mailOptions.subject,
    text: mailOptions.text,
    html: mailOptions.html,
    attachments: mailOptions.attachments?.map((att) => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    })),
  });

  return info;
}
