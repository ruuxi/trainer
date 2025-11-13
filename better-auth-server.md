Using Better Auth from the server
To use Better Auth's server methods in server rendering, server functions, or any other Next.js server code, use Convex functions and call the function from your server code.

First, a token helper for calling Convex functions from your server code.

src/lib/auth-server.ts

import { createAuth } from "@/convex/auth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
export const getToken = () => {
  return getTokenNextjs(createAuth);
};
Here's an example Convex function that uses Better Auth's server methods, and a server action that calls the Convex function.

convex/users.ts

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { createAuth, authComponent } from "./auth";
export const updateUserPassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
    await auth.api.changePassword({
      body: {
        currentPassword: args.currentPassword,
        newPassword: args.newPassword,
      },
      headers,
    });
  },
});
app/actions.ts

"use server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../convex/_generated/api";
import { getToken } from "../lib/auth-server";
// Authenticated mutation via server function
export async function updatePassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string;
  newPassword: string;
}) {
  const token = await getToken();
  await fetchMutation(
    api.users.updatePassword,
    { currentPassword, newPassword },
    { token }
  );
}