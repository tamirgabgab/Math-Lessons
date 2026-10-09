/**
 * Lazily loads a hidden GeoGebra CAS (public/cas.html in an off-screen iframe) and keeps
 * it for the rest of the session.
 */

interface CasApi {
  evalCommandCAS: (cmd: string) => string;
}

let casPromise: Promise<CasApi> | null = null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function load(): Promise<CasApi> {
  const iframe = document.createElement("iframe");
  iframe.src = "/cas.html";
  iframe.title = "GeoGebra CAS";
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "600px",
    height: "400px",
    border: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);

  const deadline = Date.now() + 45000;
  const win = () => iframe.contentWindow as (Window & { casReady?: Promise<CasApi> }) | null;
  while (!win()?.casReady) {
    if (Date.now() > deadline) throw new Error("timeout");
    await sleep(100);
  }
  const api = await win()!.casReady!;
  // the CAS engine (Giac) finishes loading after the applet — until then every answer is "?"
  while (api.evalCommandCAS("1+1") !== "2") {
    if (Date.now() > deadline) throw new Error("timeout");
    await sleep(250);
  }
  return api;
}

export function getCas(): Promise<CasApi> {
  if (!casPromise) {
    casPromise = load().catch((e) => {
      casPromise = null; // allow a retry (e.g. after reconnecting to the internet)
      throw e;
    });
  }
  return casPromise;
}
