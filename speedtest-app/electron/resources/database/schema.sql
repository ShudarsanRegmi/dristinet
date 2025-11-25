-- Speedtest Monitor Database Schema
-- SQLite database for storing speedtest results

CREATE TABLE IF NOT EXISTS speedtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_mbps REAL NOT NULL,
    upload_mbps REAL NOT NULL,
    ping_ms REAL NOT NULL,
    jitter_ms REAL,
    server_id TEXT,
    server_name TEXT,
    server_location TEXT,
    isp TEXT,
    external_ip TEXT,
    internal_ip TEXT,
    interface TEXT,
    packet_loss_percent REAL DEFAULT 0,
    test_type TEXT DEFAULT 'auto',
    result_url TEXT,
    raw_data TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS speedtest_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_run DATETIME,
    next_run DATETIME,
    status TEXT DEFAULT 'stopped',
    error_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_timestamp ON speedtest_results(timestamp);
CREATE INDEX IF NOT EXISTS idx_download ON speedtest_results(download_mbps);
CREATE INDEX IF NOT EXISTS idx_upload ON speedtest_results(upload_mbps);
