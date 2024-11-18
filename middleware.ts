import { KameleoonClient } from "@kameleoon/nodejs-sdk";
import { NextRequest, NextResponse } from "next/server";
import {
  VercelEventSource,
  VercelRequester,
  VercelVisitorCodeManager,
} from "./sdkExternals";

// -- Replace it with your featureKey from Kameleoon Platform
//    If you follow the instruction from `README`, leave `featureKey` as it is
const FEATURE_KEY = "new_home_page";

// -- Paths to invoke the middleware on
export const config = {
  matcher: ["/", "/new-home-page"],
};

// -- Keeping KameleoonClient instance in memory
let client: KameleoonClient;

export default async function middleware(request: NextRequest) {
  if (
    !process.env.KAMELEOON_SITE_CODE ||
    !process.env.KAMELEOON_CLIENT_ID ||
    !process.env.KAMELEOON_CLIENT_SECRET
  ) {
    throw new Error(
      "[KAMELEOON] ERROR: Missing the one of Kameleoon environment variables, please make sure to set KAMELEOON_SITE_CODE, KAMELEOON_CLIENT_ID, KAMELEOON_CLIENT_SECRET"
    );
  }

  // -- Create an instance of KameleoonClient if it doesn't exist
  if (!client) {
    client = new KameleoonClient({
      siteCode: process.env.KAMELEOON_SITE_CODE!,
      credentials: {
        clientId: process.env.KAMELEOON_CLIENT_ID!,
        clientSecret: process.env.KAMELEOON_CLIENT_SECRET!,
      },
      externals: {
        requester: new VercelRequester(),
        eventSource: new VercelEventSource(),
        visitorCodeManager: new VercelVisitorCodeManager(),
      },
    });
  }

  // -- Initialize KameleoonClient if it's not initialized yet
  if (!client.isInitialized()) {
    await client.initialize();
  }

  // -- Get visitor code from cookies or generate a new one
  const visitorCode = client.getVisitorCode({
    input: request,
    output: null,
  });

  // -- Get the variation for the visitor under visitorCode in the found feature flag
  const variation = client.getVariation({
    visitorCode,
    featureKey: FEATURE_KEY,
  });

  // -- Get the value of the variable from the found feature flag
  const homePageVariable = variation.variables.get("home_page");

  console.log(
    `[KAMELEOON] Feature flag with '${FEATURE_KEY}' feature key is '${
      variation.key === "on" ? "active" : "inactive"
    }'`
  );
  console.log(
    `[KAMELEOON] Feature flag with '${FEATURE_KEY}' feature key has '${homePageVariable?.value}' variable`
  );

  // -- Rewriting the path based on `homePageVariable` value
  //    If the value is `old_version`, it returns `/` path, otherwise `/new-home-page`
  request.nextUrl.pathname =
    homePageVariable?.value === "old_version" ? "/" : "/new-home-page";

  const response = NextResponse.rewrite(request.nextUrl);

  // -- (Optional) Set the visitor code in response cookies (in case it was originally generated in the middleware)
  client.getVisitorCode({ input: request, output: response });

  return response;
}
