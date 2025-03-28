import { toNextJsHandler } from "better-auth/next-js";

// path to your auth file
import { auth } from "@/lib/auth";

export const { POST, GET } = toNextJsHandler(auth);
