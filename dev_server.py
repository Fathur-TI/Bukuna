"""
Server Lokal BUKUNA (Fallback Tanpa Node.js & Pengujian Cepat)
Membaca langsung seluruh file modular di dalam folder /src (data, hooks, context, components, pages)
serta menyajikan aset statis dari folder /public (/assets/logo-bukuna.svg, favicon, dll.)
di http://localhost:5173 dengan dukungan penuh SPA routing React Router.
"""
import http.server
import importlib
import mimetypes
import os
import socketserver
import sys
import urllib.parse
import build_offline_bundle

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
PUBLIC_DIR = os.path.join(ROOT_DIR, "public")
PORT = int(os.environ.get("PORT", 5173))

mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("application/pdf", ".pdf")


class ThreadingHTTPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


class BukunaHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.unquote(self.path.split("?", 1)[0])

        # Handle /favicon.ico by serving /public/assets/favicon-32x32.png
        if parsed_path == "/favicon.ico":
            fav_path = os.path.join(PUBLIC_DIR, "assets", "favicon-32x32.png")
            if os.path.isfile(fav_path):
                self._serve_file(fav_path, "image/png")
                return

        # Serve any existing static asset from /public (e.g., /assets/logo-bukuna.svg)
        rel_path = parsed_path.lstrip("/")
        if rel_path:
            candidate = os.path.normpath(os.path.join(PUBLIC_DIR, rel_path))
            if candidate.startswith(os.path.normpath(PUBLIC_DIR)) and os.path.isfile(candidate):
                ctype, _ = mimetypes.guess_type(candidate)
                self._serve_file(candidate, ctype or "application/octet-stream")
                return

        # Fallback to SPA index HTML for all React Router routes
        importlib.reload(build_offline_bundle)
        html_bytes = build_offline_bundle.build_standalone_html().encode("utf-8")
        try:
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(html_bytes)))
            self.end_headers()
            self.wfile.write(html_bytes)
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def _serve_file(self, filepath, content_type):
        try:
            with open(filepath, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(data)
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass

    def log_message(self, fmt, *args):
        sys.stdout.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    with ThreadingHTTPServer(("", PORT), BukunaHandler) as httpd:
        print(f"Server BUKUNA aktif di http://localhost:{PORT}")
        httpd.serve_forever()
