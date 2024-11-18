import {
  IExternalCustomVisitorCodeManager,
  IExternalEventSource,
  GetDataCustomParametersType,
  SetDataCustomParametersType,
  IExternalRequester,
  KameleoonResponseType,
  RequestType,
  SendRequestParametersType,
  KameleoonUtils,
} from "@kameleoon/nodejs-sdk";
import { createClient } from "@vercel/edge-config";
import { NextRequest, NextResponse } from "next/server";

// -- Custom implementation of Kameleoon EventSource
export class VercelEventSource implements IExternalEventSource {
  public open(): void {
    // -- Vercel does not support Server-Sent Events
    throw new Error("Vercel does not support Real-Time Updates");
  }

  public close(): void {}
}

// -- Custom implementation of Kameleoon Requester
//    in order to collect the configuration from Vercel Edge Config
export class VercelRequester implements IExternalRequester {
  public async sendRequest<T extends RequestType>({
    requestType,
    url,
    parameters,
  }: SendRequestParametersType<T>): Promise<KameleoonResponseType> {
    if (requestType === RequestType.Configuration) {
      const edgeConfigClient = createClient(process.env.EDGE_CONFIG);
      const clientConfiguration = await edgeConfigClient.get(
        process.env.KAMELEOON_SITE_CODE!
      );

      const data =
        typeof clientConfiguration === "string" && clientConfiguration.length
          ? JSON.parse(clientConfiguration)
          : null;

      return KameleoonUtils.simulateSuccessRequest<RequestType.Configuration>(
        requestType,
        data
      );
    }

    return await fetch(url, parameters);
  }
}

// -- Custom implementation of Kameleoon VisitorCodeManager
//    in order to be able to get visitor code from cookies
export class VercelVisitorCodeManager
  implements IExternalCustomVisitorCodeManager
{
  public getData(params: GetDataCustomParametersType): string | null {
    const { key, input } = params;

    const cookies = (input as NextRequest).cookies.get(key);

    if (!cookies) {
      return null;
    }

    return cookies.value;
  }

  public setData(params: SetDataCustomParametersType): void {
    const { key, visitorCode, domain, maxAge, path, output } = params;

    if (!output) {
      return;
    }

    (output as NextResponse).cookies.set(key, visitorCode, {
      domain,
      maxAge,
      path,
    });
  }
}
