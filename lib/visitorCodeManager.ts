import {
  GetDataCustomParametersType,
  SetDataCustomParametersType,
  IExternalCustomVisitorCodeManager,
} from "@kameleoon/nodejs-sdk";
import { RequestCookies, ResponseCookies } from "@edge-runtime/cookies";

// Persist the visitor code in cookies so the middleware can read it on later
// requests. `input` is the request's `Headers`, `output` the `Headers` the
// response is created with, so the cookie can be written before the response
// exists (the rewrite target depends on the visitor code). `RequestCookies` /
// `ResponseCookies` are the classes behind `NextRequest.cookies` and
// `NextResponse.cookies`, used here on plain `Headers`.
export class VercelVisitorCodeManager
  implements IExternalCustomVisitorCodeManager
{
  // Read the visitor code from the request cookies.
  getData({ key, input }: GetDataCustomParametersType): string | null {
    return new RequestCookies(input as Headers).get(key)?.value ?? null;
  }

  // Store the visitor code in the response cookies for future requests.
  setData({
    key,
    visitorCode,
    domain,
    maxAge,
    path,
    output,
  }: SetDataCustomParametersType): void {
    new ResponseCookies(output as Headers).set(key, visitorCode, {
      domain,
      maxAge,
      path,
      sameSite: "lax",
      // Vercel serves over HTTPS; local `next dev` runs on http://localhost
      secure: process.env.NODE_ENV === "production",
    });
  }
}
