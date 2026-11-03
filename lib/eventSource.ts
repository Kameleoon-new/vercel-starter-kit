import { IExternalEventSource } from "@kameleoon/nodejs-sdk";

// Edge Middleware does not support long-lived connections, so real-time
// configuration updates are unavailable in this environment. The configuration
// is refreshed on request instead, see ENABLE_DATAFILE_REFRESH in middleware.ts.
export class VercelEventSource implements IExternalEventSource {
  public open(): void {}

  public close(): void {}

  public onError(): void {}
}
