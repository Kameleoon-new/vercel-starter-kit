import {
  ConfigurationDataType,
  IExternalRequester,
  KameleoonResponseType,
  KameleoonUtils,
  RequestType,
  SendRequestParametersType,
} from "@kameleoon/nodejs-sdk";
import { createClient, type GlobalConfigClient } from "@vercel/global-config";
import {
  DATAFILE_SOURCE,
  DatafileSource,
  GLOBAL_CONFIG,
  SITE_CODE,
} from "./constants";

// Requests over the Fetch API, with the configuration (data file) served from
// Global Config when DATAFILE_SOURCE is `DatafileSource.GlobalConfig`. Tracking and access
// token requests always go to Kameleoon.
export class VercelRequester implements IExternalRequester {
  private readonly globalConfig: GlobalConfigClient | null = null;

  constructor() {
    if (DATAFILE_SOURCE === DatafileSource.GlobalConfig) {
      if (GLOBAL_CONFIG) {
        this.globalConfig = createClient(GLOBAL_CONFIG);
      } else {
        console.warn(
          "[KAMELEOON] GLOBAL_CONFIG is not set, the configuration will be requested from the Kameleoon CDN",
        );
      }
    }
  }

  public async sendRequest<T extends RequestType>({
    requestType,
    url,
    parameters,
  }: SendRequestParametersType<T>): Promise<KameleoonResponseType> {
    if (requestType === RequestType.Configuration && this.globalConfig) {
      const data = await this.readConfiguration(url);

      if (data !== null) {
        return KameleoonUtils.simulateSuccessRequest<RequestType.Configuration>(
          requestType,
          data as ConfigurationDataType,
        );
      }

      console.warn(
        `[KAMELEOON] Global Config isn't available, requesting the configuration from ${url}`,
      );
    }

    return fetch(url, parameters);
  }

  // The integration stores the configuration as a JSON string; Global Config
  // returns the item as stored.
  private async readConfiguration(url: string): Promise<unknown> {
    try {
      const config = await this.globalConfig!.get<string>(
        getConfigItemKey(url),
      );

      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.warn("[KAMELEOON] Global Config read failed", error);
      return null;
    }
  }
}

// Kameleoon stores the configuration under `${SITE_CODE}_V${n}`, where `n` is the
// configuration format version. The SDK requests `https://sdk-config.kameleoon.eu/v{n}/...`,
// so deriving the version from the first path segment guarantees the item matches
// the format the SDK expects.
function getConfigItemKey(url: string): string {
  const version = url.match(/^https?:\/\/[^/]+\/v(\d+)\//)?.[1];

  if (!version) {
    throw new Error(`Unable to detect configuration version from URL: ${url}`);
  }

  return `${SITE_CODE}_V${version}`;
}
