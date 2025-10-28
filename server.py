#!/usr/bin/env python3
"""
Simple HTTP server to serve the speedtest dashboard
Usage: python3 server.py [port]
Default port: 8080
"""

import http.server
import socketserver
import sys
import webbrowser
import threading
import time
from pathlib import Path

def open_browser(port):
    """Open the dashboard in the default web browser after a short delay"""
    time.sleep(1)
    webbrowser.open(f'http://localhost:{port}')

def main():
    # Get port from command line argument or use default
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    
    # Change to the directory containing this script
    script_dir = Path(__file__).parent
    import os
    os.chdir(script_dir)
    
    # Create HTTP handler
    handler = http.server.SimpleHTTPRequestHandler
    
    # Set CORS headers for local development
    class CORSHTTPRequestHandler(handler):
        def end_headers(self):
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', '*')
            super().end_headers()
    
    try:
        with socketserver.TCPServer(("", port), CORSHTTPRequestHandler) as httpd:
            print(f"🚀 Speedtest Dashboard Server starting...")
            print(f"📊 Serving at: http://localhost:{port}")
            print(f"📁 Directory: {script_dir}")
            print(f"⚡ Press Ctrl+C to stop the server")
            print("=" * 50)
            
            # Open browser in a separate thread
            threading.Thread(target=open_browser, args=(port,), daemon=True).start()
            
            # Start serving
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n🛑 Server stopped by user")
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Error: Port {port} is already in use")
            print(f"💡 Try using a different port: python3 server.py {port + 1}")
        else:
            print(f"❌ Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    main()
