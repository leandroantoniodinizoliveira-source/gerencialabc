import { app, startServer } from "../server.js";

let isReady = false;
let initPromise: Promise<void> | null = null;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  if (!isReady) {
    if (!initPromise) initPromise = startServer(true);
    await initPromise;
    isReady = true;
  }
  return app(req, res);
}
