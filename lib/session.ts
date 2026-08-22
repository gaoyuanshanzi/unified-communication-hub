import { SessionOptions } from "iron-session";

export interface SessionData {
  sessionId?: string;
  isLoggedIn: boolean;
  adminId?: string;
  loginTime?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "comm_hub_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 8, // 8시간
  },
};

declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
