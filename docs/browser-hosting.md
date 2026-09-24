# Hosting requirements: cross-origin isolation

The engine uses pthreads, which compile to Web Workers sharing one
`SharedArrayBuffer`. Browsers only hand out `SharedArrayBuffer` to a **cross-origin
isolated** page. That is not a build flag; it is a property of how the page is served,
and it constrains the whole product, not just the game canvas.

This document records what the final browser product must do. Nothing here is
implemented yet; M3f is documentation only on this point.

## The two required headers

The document that hosts the game must be served with both:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

`window.crossOriginIsolated` is `true` only when both are present. Without it,
`SharedArrayBuffer` is undefined and the engine cannot start at all: it is not a
degraded mode, it is a hard failure.

The development server (`wasm/scripts/serve.py`) already sends both, plus
`Cross-Origin-Resource-Policy: same-origin`. The `COEP` environment variable can
switch it to `credentialless` for experiments.

### `require-corp` versus `credentialless`

| | `require-corp` | `credentialless` |
|---|---|---|
| Every cross-origin subresource must opt in | yes, via `Cross-Origin-Resource-Policy` or CORS | no |
| Cross-origin requests without opt-in | blocked | sent without credentials |
| Browser support | all engines that support isolation | Chrome and Firefox; **Safari does not** |

`credentialless` is the pragmatic choice for a site that embeds third-party images or
scripts, because those no longer need to send `Cross-Origin-Resource-Policy`. It costs
Safari support. The prototype uses `require-corp` and serves everything same-origin,
which is the strictest and most portable position, and the one to keep unless a
concrete third-party asset forces a change.

## What isolation breaks

This is the part that matters for product decisions, because it is easy to design a
site that cannot host the game.

| Thing | Effect under isolation | Way out |
|---|---|---|
| Third-party `<script>` (analytics, tag managers, chat widgets) | blocked unless the origin sends `Cross-Origin-Resource-Policy: cross-origin`, which most do not | self-host the script, or use `credentialless`, or keep the script off the isolated document |
| Third-party images, fonts, media | blocked under `require-corp` unless they opt in | serve from our own origin, or `crossorigin` with CORS, or `credentialless` |
| `<iframe>` of another origin | must itself be isolated, or it is blocked | embed nothing, or proxy it |
| Embedding **our** game in someone else's page | that page must also send both headers | publish the requirement; an embed cannot be a plain `<iframe>` on an unprepared site |
| `window.open` popups to another origin | `COOP: same-origin` severs `window.opener`, so popup-based OAuth cannot post a result back | redirect-based OAuth, or run the sign-in on a separate non-isolated document |
| Authentication providers using popup flows | same as above | use redirect flows |
| Advertising | effectively incompatible: ad scripts are third-party, credentialled and iframe-heavy | do not put ads on the isolated document |
| Video and social embeds | same as iframes | link out instead |

The shape this pushes towards: **the game document is a clean, same-origin, isolated
page that loads only our own assets, and anything social, commercial or third-party
lives on separate, non-isolated pages.** That is a routing decision, and it is cheap to
make now and expensive to retrofit.

## Vercel

Vercel does not set these headers by default. They go in `vercel.json`, scoped to the
game route rather than the whole site so that marketing pages can keep third-party
scripts:

```json
{
  "headers": [
    {
      "source": "/play/:path*",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

Notes specific to that platform:

* Headers apply to the document and to assets served from the same deployment. The
  `.wasm` file needs the correct `Content-Type: application/wasm` for streaming
  compilation; Vercel sets it, but it is worth asserting in a deploy check.
* Vercel Analytics and Speed Insights inject a script from `va.vercel-scripts.com`.
  Under `require-corp` that is a cross-origin subresource and will be blocked on the
  isolated route. Either keep analytics off the game route, self-host the script, or
  move to `credentialless` and accept losing Safari.
* Preview deployments get their own subdomain, so anything allow-listed by origin must
  account for them.
* Vercel's deployment-protection login is a redirect on the same origin, so it does not
  conflict with `COOP: same-origin`.

## Safari

Safari supports cross-origin isolation with `require-corp` but not `credentialless`.
Since the prototype is same-origin throughout, `require-corp` keeps Safari viable, which
is the reason to prefer it. Safari's pthread and `SharedArrayBuffer` support still needs
its own smoke test before any claim is made about it; see the cross-browser section of
the M3f report.

## Checklist for the production host

1. Both headers on the game document, and on the worker and wasm responses.
2. `Content-Type: application/wasm`.
3. No cross-origin subresource on the isolated route.
4. Redirect-based authentication only, if authentication ever reaches that route.
5. A startup assertion that `crossOriginIsolated` is true, failing with an explanation
   rather than an opaque `SharedArrayBuffer is not defined`.
6. Analytics, ads, embeds and social widgets on separate non-isolated routes.
