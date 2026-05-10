-- Speedtest Monitor Database Schema
-- SQLite database for storing speedtest results

CREATE TABLE IF NOT EXISTS speedtest_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    download_mbps REAL,
    upload_mbps REAL,
    ping_ms REAL,
    jitter_ms REAL,
    server_id TEXT,
    server_name TEXT,
    server_location TEXT,
    isp TEXT,
    external_ip TEXT,
    internal_ip TEXT,
    wifi_name TEXT,
    interface TEXT,
    hostname TEXT,
    user_name TEXT,
    uptime TEXT,
    packet_loss_percent REAL DEFAULT 0,
    test_type TEXT DEFAULT 'auto',
    source TEXT DEFAULT 'collector',
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
CREATE INDEX IF NOT EXISTS idx_test_type ON speedtest_results(test_type);
CREATE INDEX IF NOT EXISTS idx_wifi_name ON speedtest_results(wifi_name);
CREATE INDEX IF NOT EXISTS idx_interface ON speedtest_results(interface);
CREATE INDEX IF NOT EXISTS idx_result_url ON speedtest_results(result_url);
