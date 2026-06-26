import { createMiddleware } from "@tanstack/react-start";

import { lovableCloudAuth } from "./auth";

export const attachLovableCloudAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await lovableCloudAuth.getAccessToken();

    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
