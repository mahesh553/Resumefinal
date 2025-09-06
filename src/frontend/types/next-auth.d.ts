import { DefaultSession } from "next-auth";
import { UserRole } from "./index";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      firstName: string;
      lastName: string;
    } & DefaultSession["user"];
    accessToken: string;
    error?: string;
  }

  interface User {
    id: string;
    role: UserRole;
    firstName: string;
    lastName: string;
    accessToken: string;
    refreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken: string;
    refreshToken: string;
    accessTokenExpires: number;
    role: UserRole;
    firstName: string;
    lastName: string;
    error?: string;
  }
}
