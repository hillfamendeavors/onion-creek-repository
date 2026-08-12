import '@astrojs/internal-helpers/path';
import '@astrojs/internal-helpers/remote';
import 'piccolore';
import { n as NOOP_MIDDLEWARE_HEADER, o as decodeKey } from './chunks/astro/server_CS2ok9BF.mjs';
import 'clsx';
import 'es-module-lexer';
import 'html-escaper';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

const codeToStatusMap = {
  // Implemented from IANA HTTP Status Code Registry
  // https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  CONTENT_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  MISDIRECTED_REQUEST: 421,
  UNPROCESSABLE_CONTENT: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  TOO_EARLY: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  NETWORK_AUTHENTICATION_REQUIRED: 511
};
Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/","cacheDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/node_modules/.astro/","outDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/dist/","srcDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/src/","publicDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/public/","buildClientDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/dist/","buildServerDir":"file:///C:/Users/marco/Documents/projects/onion-creek-repository/.netlify/build/","adapterName":"@astrojs/netlify","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"always"}}},{"file":"404.html","links":[],"scripts":[],"styles":[{"type":"inline","content":":root{--masters-green: #1a3a2a;--masters-green-mid: #2d5a3d;--masters-yellow: #f5d06e;--off-white: #f8f8f6;--text: #1a1a18;--border: #d0d0c8}[data-astro-cid-zetdm5md]{box-sizing:border-box;margin:0;padding:0}body{font-family:\"Source Sans 3\",sans-serif;background:var(--off-white);color:var(--text);min-height:100vh;display:flex;flex-direction:column}header[data-astro-cid-zetdm5md]{background:var(--masters-green);color:#fff;padding:24px 20px;text-align:center;border-bottom:3px solid var(--masters-yellow)}.logo-link[data-astro-cid-zetdm5md]{text-decoration:none;color:#fff;display:inline-flex;align-items:center;gap:12px}.logo-icon[data-astro-cid-zetdm5md]{width:36px;height:36px}.logo-title[data-astro-cid-zetdm5md]{font-family:EB Garamond,serif;font-size:1.5rem;letter-spacing:2px;text-transform:uppercase}.logo-title[data-astro-cid-zetdm5md] span[data-astro-cid-zetdm5md]{color:var(--masters-yellow)}main[data-astro-cid-zetdm5md]{max-width:720px;margin:60px auto;padding:0 20px;text-align:center;flex:1}.error-code[data-astro-cid-zetdm5md]{font-family:EB Garamond,serif;font-size:5rem;color:var(--masters-green);line-height:1;margin-bottom:8px}h1[data-astro-cid-zetdm5md]{font-family:EB Garamond,serif;font-size:2rem;font-weight:400;margin-bottom:16px;color:var(--text)}p[data-astro-cid-zetdm5md]{font-size:1.05rem;color:#555;margin-bottom:36px;line-height:1.6}.neighborhood-grid[data-astro-cid-zetdm5md]{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:40px}.neighborhood-card[data-astro-cid-zetdm5md]{background:#fff;border:1px solid var(--border);border-radius:4px;padding:20px;text-decoration:none;color:var(--text);font-weight:600;font-size:.95rem;transition:all .2s ease;box-shadow:0 2px 4px #0000000a;display:flex;align-items:center;justify-content:space-between}.neighborhood-card[data-astro-cid-zetdm5md]:hover{border-color:var(--masters-green);transform:translateY(-2px);box-shadow:0 4px 12px #00000014}.neighborhood-card[data-astro-cid-zetdm5md] svg[data-astro-cid-zetdm5md]{width:16px;height:16px;stroke:var(--masters-green);transition:transform .2s}.neighborhood-card[data-astro-cid-zetdm5md]:hover svg[data-astro-cid-zetdm5md]{transform:translate(4px)}.home-btn[data-astro-cid-zetdm5md]{display:inline-block;background:var(--masters-green);color:var(--masters-yellow);text-decoration:none;padding:12px 28px;border-radius:4px;font-weight:600;letter-spacing:1px;text-transform:uppercase;font-size:.85rem;transition:background .2s}.home-btn[data-astro-cid-zetdm5md]:hover{background:var(--masters-green-mid)}footer[data-astro-cid-zetdm5md]{text-align:center;padding:24px;font-size:.8rem;color:#777;border-top:1px solid #e0e0e0}\n"}],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"always"}}},{"file":"login/index.html","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/_neighborhood_.CjUTW5tN.css"},{"type":"external","src":"/_astro/login.CuovykwA.css"}],"routeData":{"route":"/login","isIndex":false,"type":"page","pattern":"^\\/login\\/$","segments":[[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/login.astro","pathname":"/login","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"always"}}},{"file":"reset-password/index.html","links":[],"scripts":[],"styles":[{"type":"inline","content":"body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#f7f7f5;color:#222}h1[data-astro-cid-oiuorpsm]{font-size:1.3rem;margin-bottom:16px}#resetView[data-astro-cid-oiuorpsm],#invalidView[data-astro-cid-oiuorpsm],#successView[data-astro-cid-oiuorpsm]{max-width:320px;margin:80px auto}#resetView[data-astro-cid-oiuorpsm] input[data-astro-cid-oiuorpsm]{display:block;width:100%;box-sizing:border-box;margin-bottom:10px;padding:8px;border:1px solid #ccc;border-radius:4px}#resetView[data-astro-cid-oiuorpsm] button[data-astro-cid-oiuorpsm]{padding:8px 16px;border:none;border-radius:4px;background:#1a3a2a;color:#fff;cursor:pointer}#resetError[data-astro-cid-oiuorpsm]{color:#b00020;font-size:.85rem;min-height:1.2em}#invalidView[data-astro-cid-oiuorpsm],#successView[data-astro-cid-oiuorpsm]{display:none}#successView[data-astro-cid-oiuorpsm] a[data-astro-cid-oiuorpsm]{color:#1a3a2a}\n"}],"routeData":{"route":"/reset-password","isIndex":false,"type":"page","pattern":"^\\/reset-password\\/$","segments":[[{"content":"reset-password","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/reset-password.astro","pathname":"/reset-password","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"always"}}},{"file":"index.html","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/index.BejdyQjV.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"always"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image/","pattern":"^\\/_image\\/$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image/","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"always"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.dA3LP0Q0.css"}],"routeData":{"route":"/admin","isIndex":false,"type":"page","pattern":"^\\/admin\\/$","segments":[[{"content":"admin","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin.astro","pathname":"/admin","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"always"}}}],"site":"https://trustedneighbors.net","base":"/","trailingSlash":"always","compressHTML":true,"componentMetadata":[["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/404.astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/index.astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/login.astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/reset-password.astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/[neighborhood].astro",{"propagation":"none","containsHead":true}],["C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/[neighborhood]/requests.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image/index.astro.mjs","\u0000@astro-page:src/pages/404@_@astro":"pages/404.astro.mjs","\u0000@astro-page:src/pages/[neighborhood]/requests@_@astro":"pages/_neighborhood_/requests.astro.mjs","\u0000@astro-page:src/pages/[neighborhood]@_@astro":"pages/_neighborhood_.astro.mjs","\u0000@astro-page:src/pages/admin@_@astro":"pages/admin.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-page:src/pages/login@_@astro":"pages/login.astro.mjs","\u0000@astro-page:src/pages/reset-password@_@astro":"pages/reset-password.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_CmNnVp4s.mjs","C:/Users/marco/Documents/projects/onion-creek-repository/node_modules/unstorage/drivers/netlify-blobs.mjs":"chunks/netlify-blobs_DM36vZAS.mjs","C:/Users/marco/Documents/projects/onion-creek-repository/src/layouts/Directory.astro?astro&type=script&index=0&lang.ts":"_astro/Directory.astro_astro_type_script_index_0_lang.DFW-TpT3.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/[neighborhood]/requests.astro?astro&type=script&index=0&lang.ts":"_astro/requests.astro_astro_type_script_index_0_lang.DC7c6Lpl.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro?astro&type=script&index=0&lang.ts":"_astro/admin.astro_astro_type_script_index_0_lang.DBQ2Rxbn.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/admin.astro?astro&type=script&index=1&lang.ts":"_astro/admin.astro_astro_type_script_index_1_lang.P4KlG2sQ.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/index.astro?astro&type=script&index=0&lang.ts":"_astro/index.astro_astro_type_script_index_0_lang.D4Q5joO7.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/login.astro?astro&type=script&index=0&lang.ts":"_astro/login.astro_astro_type_script_index_0_lang.DSKc3hDU.js","C:/Users/marco/Documents/projects/onion-creek-repository/src/pages/reset-password.astro?astro&type=script&index=0&lang.ts":"_astro/reset-password.astro_astro_type_script_index_0_lang.DEdMM-I_.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/_neighborhood_.CjUTW5tN.css","/_astro/admin.dA3LP0Q0.css","/_astro/index.BejdyQjV.css","/_astro/login.CuovykwA.css","/favicon.svg","/robots.txt","/assets/austin_skyline.png","/assets/Downtown_Skyline_Upscale_Paulina_Skarbowska_Wiewior_bateyes_atx_Lifetime_Usage__4469f6fe-40d5-4df8-8fee-22b3b75c9862.jpg","/assets/wallpapersden.com_austin-texas-bridge_1680x1050.jpg","/_astro/admin.astro_astro_type_script_index_0_lang.DBQ2Rxbn.js","/_astro/admin.astro_astro_type_script_index_1_lang.P4KlG2sQ.js","/_astro/auth.BhwI1LzA.js","/_astro/Directory.astro_astro_type_script_index_0_lang.DFW-TpT3.js","/_astro/index.astro_astro_type_script_index_0_lang.D4Q5joO7.js","/_astro/login.astro_astro_type_script_index_0_lang.DSKc3hDU.js","/_astro/requests.astro_astro_type_script_index_0_lang.DC7c6Lpl.js","/_astro/reset-password.astro_astro_type_script_index_0_lang.DEdMM-I_.js","/_astro/supabase.CkyLufil.js","/404.html","/login/index.html","/reset-password/index.html","/index.html"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"9NFO2uDIaIVaq+fBkfGOq0xoFRoSIzbES77UnK33j3o=","sessionConfig":{"driver":"netlify-blobs","options":{"name":"astro-sessions","consistency":"strong"}}});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = () => import('./chunks/netlify-blobs_DM36vZAS.mjs');

export { manifest };
