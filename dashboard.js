class SpeedtestDashboard {
    constructor() {
        this.data = [];
        this.charts = {};
        this.currentFilter = 'all';
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.processData();
            this.updateStats();
            this.createCharts();
            this.showRecentTests();
            this.hideLoding();
        } catch (error) {
            this.showError('Failed to load speedtest data: ' + error.message);
        }
    }

    async loadData() {
        const response = await fetch('.speedtest_res');
        const text = await response.text();
        this.parseSpeedtestFile(text);
    }

    parseSpeedtestFile(content) {
        const entries = content.split('============================================');
        
        for (let entry of entries) {
            if (!entry.trim()) continue;
            
            const testData = this.parseEntry(entry.trim());
            if (testData) {
                this.data.push(testData);
            }
        }
        
        // Sort by timestamp
        this.data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    parseEntry(entry) {
        const lines = entry.split('\n');
        const result = {};
        
        // Find timestamp
        const timestampLine = lines.find(line => line.includes('Timestamp:'));
        if (!timestampLine) return null;
        
        result.timestamp = this.parseTimestamp(timestampLine);
        
        // Parse system info
        result.wifiName = this.extractValue(entry, /Wi-Fi Name:\s*(.+)/);
        result.hostname = this.extractValue(entry, /Hostname:\s*(.+)/);
        result.localIP = this.extractValue(entry, /Local IP:\s*(.+)/);
        result.uptime = this.extractValue(entry, /Uptime:\s*(.+)/);
        result.user = this.extractValue(entry, /User:\s*(.+)/);
        
        // Parse speedtest results
        result.server = this.extractValue(entry, /Server:\s*(.+)/);
        result.isp = this.extractValue(entry, /ISP:\s*(.+)/);
        
        // Parse latency
        const latencyMatch = entry.match(/Idle Latency:\s*([\d.]+)\s*ms/);
        result.latency = latencyMatch ? parseFloat(latencyMatch[1]) : null;
        
        // Parse jitter
        const jitterMatch = entry.match(/jitter:\s*([\d.]+)ms/);
        result.jitter = jitterMatch ? parseFloat(jitterMatch[1]) : null;
        
        // Parse download speed
        const downloadMatch = entry.match(/Download:\s*([\d.]+)\s*Mbps/);
        result.downloadSpeed = downloadMatch ? parseFloat(downloadMatch[1]) : null;
        
        // Parse upload speed  
        const uploadMatch = entry.match(/Upload:\s*([\d.]+)\s*Mbps/);
        result.uploadSpeed = uploadMatch ? parseFloat(uploadMatch[1]) : null;
        
        // Parse download latency
        const downloadLatencyMatch = entry.match(/Download:.*?\n\s*([\d.]+)\s*ms/);
        result.downloadLatency = downloadLatencyMatch ? parseFloat(downloadLatencyMatch[1]) : null;
        
        // Parse upload latency
        const uploadLatencyMatch = entry.match(/Upload:.*?\n\s*([\d.]+)\s*ms/);
        result.uploadLatency = uploadLatencyMatch ? parseFloat(uploadLatencyMatch[1]) : null;
        
        // Check for errors
        result.hasError = entry.includes('[error]') || entry.includes('FAILED');
        result.errorMessage = this.extractError(entry);
        
        // Parse result URL
        result.resultURL = this.extractValue(entry, /Result URL:\s*(.+)/);
        
        return result;
    }

    parseTimestamp(timestampLine) {
        const match = timestampLine.match(/Timestamp:\s*(.+)/);
        return match ? new Date(match[1]) : new Date();
    }

    extractValue(text, regex) {
        const match = text.match(regex);
        return match ? match[1].trim() : null;
    }

    extractError(entry) {
        const errorMatch = entry.match(/\[error\]\s*(.+)/);
        return errorMatch ? errorMatch[1].trim() : null;
    }

    processData() {
        // Filter data based on current time filter
        this.filteredData = this.data.filter(item => {
            if (this.currentFilter === 'all') return true;
            
            const now = new Date();
            const itemDate = new Date(item.timestamp);
            const diffHours = (now - itemDate) / (1000 * 60 * 60);
            
            switch (this.currentFilter) {
                case '24h': return diffHours <= 24;
                case '7d': return diffHours <= 24 * 7;
                case '30d': return diffHours <= 24 * 30;
                default: return true;
            }
        });
    }

    updateStats() {
        const validTests = this.filteredData.filter(item => !item.hasError && item.downloadSpeed !== null);
        const totalTests = this.filteredData.length;
        const failedTests = this.filteredData.filter(item => item.hasError).length;
        
        const avgDownload = validTests.length > 0 
            ? (validTests.reduce((sum, item) => sum + item.downloadSpeed, 0) / validTests.length).toFixed(2)
            : '0';
            
        const avgUpload = validTests.length > 0 
            ? (validTests.reduce((sum, item) => sum + (item.uploadSpeed || 0), 0) / validTests.length).toFixed(2)
            : '0';
            
        const avgLatency = validTests.length > 0 
            ? (validTests.reduce((sum, item) => sum + (item.latency || 0), 0) / validTests.length).toFixed(2)
            : '0';
            
        const networkName = this.data.length > 0 ? this.data[0].wifiName || 'Unknown' : 'Unknown';

        document.getElementById('avgDownload').textContent = avgDownload;
        document.getElementById('avgUpload').textContent = avgUpload;
        document.getElementById('avgLatency').textContent = avgLatency;
        document.getElementById('totalTests').textContent = totalTests;
        document.getElementById('failedTests').textContent = failedTests;
        document.getElementById('networkName').textContent = networkName;
    }

    createCharts() {
        this.createSpeedChart();
        this.createLatencyChart();
        this.createServerChart();
    }

    createSpeedChart() {
        const ctx = document.getElementById('speedChart').getContext('2d');
        const validData = this.filteredData.filter(item => !item.hasError && item.downloadSpeed !== null);
        
        if (this.charts.speed) {
            this.charts.speed.destroy();
        }

        this.charts.speed = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Download Speed (Mbps)',
                    data: validData.map(item => ({
                        x: item.timestamp,
                        y: item.downloadSpeed
                    })),
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Upload Speed (Mbps)',
                    data: validData.map(item => ({
                        x: item.timestamp,
                        y: item.uploadSpeed || 0
                    })),
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].parsed.x).toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'MMM dd HH:mm',
                                day: 'MMM dd'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Speed (Mbps)'
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    createLatencyChart() {
        const ctx = document.getElementById('latencyChart').getContext('2d');
        const validData = this.filteredData.filter(item => !item.hasError && item.latency !== null);
        
        if (this.charts.latency) {
            this.charts.latency.destroy();
        }

        this.charts.latency = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Idle Latency (ms)',
                    data: validData.map(item => ({
                        x: item.timestamp,
                        y: item.latency
                    })),
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Jitter (ms)',
                    data: validData.map(item => ({
                        x: item.timestamp,
                        y: item.jitter || 0
                    })),
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].parsed.x).toLocaleString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            displayFormats: {
                                hour: 'MMM dd HH:mm',
                                day: 'MMM dd'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Latency (ms)'
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }

    createServerChart() {
        const ctx = document.getElementById('serverChart').getContext('2d');
        const serverCounts = {};
        
        this.filteredData.forEach(item => {
            if (item.server) {
                // Extract server name (remove location and ID)
                const serverName = item.server.split(' - ')[0];
                serverCounts[serverName] = (serverCounts[serverName] || 0) + 1;
            }
        });
        
        if (this.charts.server) {
            this.charts.server.destroy();
        }

        const labels = Object.keys(serverCounts);
        const data = Object.values(serverCounts);
        const colors = this.generateColors(labels.length);

        this.charts.server = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${context.label}: ${context.parsed} tests (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    generateColors(count) {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    showRecentTests() {
        const container = document.getElementById('recentTests');
        const recentData = this.filteredData.slice(-10).reverse(); // Last 10 tests
        
        container.innerHTML = '';
        
        recentData.forEach(test => {
            const testElement = document.createElement('div');
            testElement.className = `test-entry ${test.hasError ? 'error' : ''}`;
            
            const timestamp = new Date(test.timestamp).toLocaleString();
            const server = test.server || 'Unknown Server';
            const download = test.downloadSpeed ? `${test.downloadSpeed} Mbps` : 'Failed';
            const upload = test.uploadSpeed ? `${test.uploadSpeed} Mbps` : 'Failed';
            const latency = test.latency ? `${test.latency} ms` : 'N/A';
            
            testElement.innerHTML = `
                <div class="test-timestamp">${timestamp}</div>
                <div class="test-info">
                    <div><strong>Server:</strong> ${server}</div>
                    <div><strong>Download:</strong> ${download}</div>
                    <div><strong>Upload:</strong> ${upload}</div>
                    <div><strong>Latency:</strong> ${latency}</div>
                    ${test.hasError ? `<div><strong>Error:</strong> ${test.errorMessage || 'Unknown error'}</div>` : ''}
                    ${test.resultURL ? `<div><strong>URL:</strong> <a href="${test.resultURL}" target="_blank">View Details</a></div>` : ''}
                </div>
            `;
            
            container.appendChild(testElement);
        });
    }

    setTimeFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update data and charts
        this.processData();
        this.updateStats();
        this.createCharts();
        this.showRecentTests();
    }

    hideLoding() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
    }

    showError(message) {
        document.getElementById('loading').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                ${message}
            </div>
        `;
    }
}

// Global function for filter buttons
function setTimeFilter(filter) {
    if (window.dashboard) {
        window.dashboard.setTimeFilter(filter);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new SpeedtestDashboard();
});

// Auto-refresh every 5 minutes
setInterval(() => {
    if (window.dashboard) {
        window.dashboard.init();
    }
}, 5 * 60 * 1000);
