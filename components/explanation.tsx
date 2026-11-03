const DOCS_URL =
  "https://developers.kameleoon.com/feature-management-and-experimentation/web-sdks/nodejs-sdk";

export default function Explanation() {
  return (
    <section className="flex flex-col gap-4 text-zinc-700">
      <h2 className="text-xl font-semibold text-zinc-900">
        How this example works
      </h2>
      <p>
        This example has two static pages: the default home page and a new
        version of it. A Next.js <code>middleware.ts</code> evaluates the{" "}
        <b>new_home_page</b> feature flag with the Kameleoon Node.js SDK before
        the page is rendered and rewrites the request to the right page. A
        visitor code is generated once, stored in a cookie and reused, so the
        decision sticks for the same browser.
      </p>
      <p>
        The flag configuration comes from Vercel Global Config, synced by the
        Kameleoon integration. Exposure tracking is left to Engine.js on the
        page by default, or sent by the middleware right after the response when{" "}
        <code>TRACK_IN_MIDDLEWARE</code> is enabled.
      </p>
      <p>
        See the{" "}
        <a
          className="underline hover:text-zinc-900"
          href={DOCS_URL}
          target="_blank"
          rel="noreferrer"
        >
          Kameleoon Node.js SDK documentation
        </a>{" "}
        to run feature flags and experiments with our platform.
      </p>
    </section>
  );
}
