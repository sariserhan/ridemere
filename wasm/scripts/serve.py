#!/usr/bin/env python3
"""Static dev server for the WASM build with cross-origin isolation headers.
Upstream's Emscripten build uses pthreads (SharedArrayBuffer), which browsers only
enable when the page is served with COOP/COEP. Usage: serve.py [dir] [port]"""
import sys, os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map,
                      '.wasm': 'application/wasm', '.js': 'text/javascript', '.mjs': 'text/javascript'}
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', os.environ.get('COEP', 'require-corp'))
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))

if __name__ == '__main__':
    directory = sys.argv[1] if len(sys.argv) > 1 else 'engine/openrct2/build/www'
    port = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
    os.chdir(directory)
    print(f"Serving {os.getcwd()} on http://localhost:{port}/ (COOP/COEP enabled)", flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
