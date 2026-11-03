// -- Define Kameleoon constant values, set as environment variables (see .env.example)
export const SITE_CODE = process.env.KAMELEOON_SITE_CODE ?? "";
// Required by the SDK for authenticated configuration and tracking requests (TRACK_IN_MIDDLEWARE == true).
export const CLIENT_ID = process.env.KAMELEOON_CLIENT_ID ?? "";
export const CLIENT_SECRET = process.env.KAMELEOON_CLIENT_SECRET ?? "";

// -- Define Integration constant values
// Where the SDK configuration (data file) comes from
export enum DatafileSource {
  // Recommended on Vercel: the Global Config store the Kameleoon integration
  // keeps in sync, a local read of about a millisecond. Needs the GLOBAL_CONFIG
  // connection string (set when the store is connected); if the store can't be
  // read, the Kameleoon request below is made instead, with a warning.
  GlobalConfig = "GLOBAL_CONFIG",
  // The SDK's usual request to the Kameleoon CDN
  // (https://sdk-config.kameleoon.eu/v3/<siteCode>), as in the other starter kits.
  Kameleoon = "KAMELEOON",
}
export const DATAFILE_SOURCE: DatafileSource = DatafileSource.GlobalConfig;
// Connection string of the Global Config store, created when the store is connected to the project
export const GLOBAL_CONFIG = process.env.GLOBAL_CONFIG;

// -- Request headers the middleware forwards to Server Components
export const KAMELEOON_HEADERS = {
  visitorCode: "x-kameleoon-visitor-code",
  engineTrackingCode: "x-kameleoon-engine-tracking-code",
} as const;
