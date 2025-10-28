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

    createDailyChart() {
        const ctx = document.getElementById('dailyChart').getContext('2d');
        const dailyData = this.getDailyAverages();
        
        if (this.charts.daily) {
            this.charts.daily.destroy();
        }

        this.charts.daily = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dailyData.map(d => d.date),
                datasets: [{
                    label: 'Avg Download (Mbps)',
                    data: dailyData.map(d => d.avgDownload),
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderColor: '#667eea',
                    borderWidth: 2
                }, {
                    label: 'Avg Upload (Mbps)',
                    data: dailyData.map(d => d.avgUpload),
                    backgroundColor: 'rgba(118, 75, 162, 0.7)',
                    borderColor: '#764ba2',
                    borderWidth: 2
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
                        callbacks: {
                            afterBody: function(context) {
                                const dataIndex = context[0].dataIndex;
                                const dayData = dailyData[dataIndex];
                                return [
                                    `Tests: ${dayData.testCount}`,
                                    `Avg Latency: ${dayData.avgLatency.toFixed(1)} ms`,
                                    `Failed: ${dayData.failedCount}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Speed (Mbps)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    createPerformanceChart() {
        const ctx = document.getElementById('performanceChart').getContext('2d');
        const threshold = parseFloat(document.getElementById('speedThreshold').value);
        const validData = this.filteredData.filter(item => !item.hasError && item.downloadSpeed !== null);
        
        if (this.charts.performance) {
            this.charts.performance.destroy();
        }

        // Separate data into normal and slow speeds
        const normalSpeeds = validData.filter(item => item.downloadSpeed >= threshold);
        const slowSpeeds = validData.filter(item => item.downloadSpeed < threshold);

        this.charts.performance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: `Normal Speed (≥${threshold} Mbps)`,
                    data: normalSpeeds.map(item => ({
                        x: item.timestamp,
                        y: item.downloadSpeed
                    })),
                    backgroundColor: 'rgba(46, 204, 113, 0.6)',
                    borderColor: '#2ecc71',
                    pointRadius: 4
                }, {
                    label: `Low Speed (<${threshold} Mbps)`,
                    data: slowSpeeds.map(item => ({
                        x: item.timestamp,
                        y: item.downloadSpeed
                    })),
                    backgroundColor: 'rgba(231, 76, 60, 0.8)',
                    borderColor: '#e74c3c',
                    pointRadius: 6
                }, {
                    label: 'Threshold Line',
                    data: validData.map(item => ({
                        x: item.timestamp,
                        y: threshold
                    })),
                    type: 'line',
                    borderColor: '#f39c12',
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    borderWidth: 2
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
                        callbacks: {
                            title: function(context) {
                                return new Date(context[0].parsed.x).toLocaleString();
                            },
                            label: function(context) {
                                if (context.datasetIndex === 2) return null; // Skip threshold line
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} Mbps`;
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
                            text: 'Download Speed (Mbps)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        // Update slow tests list
        this.updateSlowTestsList(slowSpeeds, threshold);
    }

    createComparisonChart() {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        const validData = this.filteredData.filter(item => !item.hasError && item.downloadSpeed !== null);
        
        if (this.charts.comparison) {
            this.charts.comparison.destroy();
        }

        // Create speed distribution histogram
        const speedBuckets = this.createSpeedBuckets(validData);

        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: speedBuckets.map(b => `${b.min}-${b.max} Mbps`),
                datasets: [{
                    label: 'Test Count',
                    data: speedBuckets.map(b => b.count),
                    backgroundColor: speedBuckets.map((b, i) => {
                        const colors = ['#e74c3c', '#f39c12', '#f1c40f', '#2ecc71', '#27ae60'];
                        return colors[Math.min(i, colors.length - 1)];
                    }),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                                return `${context.parsed.y} tests (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Speed Range (Mbps)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Tests'
                        },
                        beginAtZero: true
                    }
                }
            }
        });

        // Update comparison statistics
        this.updateComparisonStats(validData);
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

    getDailyAverages() {
        const dailyGroups = {};
        
        this.filteredData.forEach(item => {
            if (item.hasError || item.downloadSpeed === null) return;
            
            const date = new Date(item.timestamp).toLocaleDateString();
            if (!dailyGroups[date]) {
                dailyGroups[date] = {
                    downloads: [],
                    uploads: [],
                    latencies: [],
                    failed: 0,
                    total: 0
                };
            }
            
            dailyGroups[date].downloads.push(item.downloadSpeed);
            if (item.uploadSpeed) dailyGroups[date].uploads.push(item.uploadSpeed);
            if (item.latency) dailyGroups[date].latencies.push(item.latency);
            dailyGroups[date].total++;
        });

        // Count failed tests per day
        this.filteredData.forEach(item => {
            if (!item.hasError) return;
            const date = new Date(item.timestamp).toLocaleDateString();
            if (dailyGroups[date]) {
                dailyGroups[date].failed++;
                dailyGroups[date].total++;
            }
        });
        
        return Object.entries(dailyGroups)
            .map(([date, data]) => ({
                date,
                avgDownload: data.downloads.reduce((a, b) => a + b, 0) / data.downloads.length || 0,
                avgUpload: data.uploads.reduce((a, b) => a + b, 0) / data.uploads.length || 0,
                avgLatency: data.latencies.reduce((a, b) => a + b, 0) / data.latencies.length || 0,
                testCount: data.total,
                failedCount: data.failed
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }

    createSpeedBuckets(validData) {
        const speeds = validData.map(item => item.downloadSpeed);
        const minSpeed = Math.min(...speeds);
        const maxSpeed = Math.max(...speeds);
        const bucketSize = Math.max(1, Math.ceil((maxSpeed - minSpeed) / 8)); // 8 buckets
        
        const buckets = [];
        for (let i = 0; i < 8; i++) {
            const min = minSpeed + (i * bucketSize);
            const max = min + bucketSize;
            const count = speeds.filter(speed => speed >= min && (i === 7 ? speed <= max : speed < max)).length;
            
            buckets.push({
                min: min.toFixed(1),
                max: max.toFixed(1),
                count
            });
        }
        
        return buckets.filter(bucket => bucket.count > 0);
    }

    updateSlowTestsList(slowSpeeds, threshold) {
        const container = document.getElementById('slowTestsList');
        
        if (slowSpeeds.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #27ae60;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Great! No tests below ${threshold} Mbps threshold found.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="slow-tests-list">
                <h4 style="color: #e74c3c; margin-bottom: 15px;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    ${slowSpeeds.length} Slow Speed Test${slowSpeeds.length > 1 ? 's' : ''} Found
                </h4>
                ${slowSpeeds.slice(0, 20).map(test => `
                    <div class="slow-test-item">
                        <div class="slow-test-speed">${test.downloadSpeed.toFixed(2)} Mbps</div>
                        <div class="slow-test-time">${new Date(test.timestamp).toLocaleString()}</div>
                        <div style="font-size: 0.8rem; color: #666;">
                            Server: ${test.server || 'Unknown'} | 
                            Upload: ${test.uploadSpeed ? test.uploadSpeed.toFixed(2) + ' Mbps' : 'N/A'} |
                            Latency: ${test.latency ? test.latency.toFixed(1) + ' ms' : 'N/A'}
                        </div>
                    </div>
                `).join('')}
                ${slowSpeeds.length > 20 ? `<div style="text-align: center; padding: 10px; color: #666;">... and ${slowSpeeds.length - 20} more</div>` : ''}
            </div>
        `;
    }

    updateComparisonStats(validData) {
        if (validData.length === 0) return;

        const speeds = validData.map(item => item.downloadSpeed);
        const peakSpeed = Math.max(...speeds);
        const lowestSpeed = Math.min(...speeds);
        const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        
        // Calculate variance
        const variance = speeds.reduce((sum, speed) => sum + Math.pow(speed - avgSpeed, 2), 0) / speeds.length;
        const standardDeviation = Math.sqrt(variance);

        document.getElementById('peakDownload').textContent = `${peakSpeed.toFixed(2)} Mbps`;
        document.getElementById('lowestDownload').textContent = `${lowestSpeed.toFixed(2)} Mbps`;
        document.getElementById('speedVariance').textContent = `±${standardDeviation.toFixed(2)} Mbps`;
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

// Global functions for UI interactions
function setTimeFilter(filter) {
    if (window.dashboard) {
        window.dashboard.setTimeFilter(filter);
    }
}

function toggleView(viewType) {
    // Hide all analysis cards
    document.getElementById('dailyAnalysisCard').style.display = 'none';
    document.getElementById('performanceIssuesCard').style.display = 'none';
    document.getElementById('comparisonCard').style.display = 'none';
    
    // Show selected analysis card
    const cardId = viewType + (viewType === 'daily' ? 'Analysis' : viewType === 'performance' ? 'Issues' : '') + 'Card';
    document.getElementById(cardId).style.display = 'block';
    
    // Create the appropriate chart
    if (window.dashboard) {
        switch(viewType) {
            case 'daily':
                window.dashboard.createDailyChart();
                break;
            case 'performance':
                window.dashboard.createPerformanceChart();
                break;
            case 'comparison':
                window.dashboard.createComparisonChart();
                break;
        }
    }
    
    // Scroll to the chart
    document.getElementById(cardId).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updatePerformanceAnalysis() {
    const threshold = parseFloat(document.getElementById('speedThreshold').value);
    document.getElementById('thresholdValue').textContent = threshold.toFixed(1);
    
    if (window.dashboard) {
        window.dashboard.createPerformanceChart();
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
