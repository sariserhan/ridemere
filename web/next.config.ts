import type { NextConfig } from "next";

/**
 * The game needs pthreads, which need SharedArrayBuffer, which browsers only grant to
 * a cross-origin isolated document. Isolation is applied to the game route and to the
 * files it loads, and deliberately not to the rest of the site: an isolated document
 * cannot load third-party scripts, cannot embed cross-origin frames, and severs
 * window.opener, so marketing and future account pages stay outside it.
 *
 * Under COEP require-corp every subresource must opt in, including same-origin ones,
 * which is why /game also carries Cross-Origin-Resource-Policy.
 *
 * See docs/web-product-architecture.md.
 */
const isolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/play", headers: isolationHeaders },
      { source: "/play/:path*", headers: isolationHeaders },
      // The engine, its worker script and the content archive.
      { source: "/game/:path*", headers: isolationHeaders },
    ];
  },
};

export default nextConfig;
