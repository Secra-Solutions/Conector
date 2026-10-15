// Who is acting in the current request (a panel user, or the user behind an agent token). Credentials are resolved
// per actor: a user's personal connection wins over the team's shared one.
import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage();

/** Runs `fn` with `actor` ({ userId, via: "panel" | "mcp" | "api" | "cli" }) as the current actor. */
export const runAs = (actor, fn) => storage.run(actor, fn);

export const currentActor = () => storage.getStore() || null;
