# Servidor de desenvolvimento: envia sempre no-store para o browser nunca guardar módulos em cache.
import sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        super().end_headers()
    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8767
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
