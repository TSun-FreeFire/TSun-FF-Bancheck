"""
Gunicorn configuration for TSun-FF-Bancheck
Tuned for 100+ requests/second on a VPS behind Nginx.
"""

import multiprocessing

# --- Server socket ---
bind = "0.0.0.0:8072"

# --- Worker processes ---
# gevent async workers are ideal for this I/O-bound app
# (outbound HTTP requests to namecheck + bancheck APIs)
# Each gevent worker handles many concurrent requests via greenlets.
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "gevent"
worker_connections = 500  # concurrent connections per worker

# --- Timeouts ---
timeout = 120          # kill worker if silent for 120s (upstream calls can be slow)
graceful_timeout = 30  # seconds to finish requests on reload/stop
keepalive = 5          # keep-alive for connections from Nginx

# --- Logging ---
accesslog = "-"        # stdout
errorlog = "-"         # stderr
loglevel = "info"

# --- Process naming ---
proc_name = "tsun-ff-bancheck"

# --- Security ---
limit_request_line = 8190
limit_request_fields = 100
limit_request_field_size = 8190

# --- Performance ---
preload_app = True     # load app before forking workers (saves memory)
max_requests = 5000    # restart worker after N requests (prevent memory leaks)
max_requests_jitter = 500  # stagger restarts so they don't all happen at once
