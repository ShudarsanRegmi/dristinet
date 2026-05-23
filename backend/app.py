from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import json
import re
import subprocess
import threading
from datetime import datetime
import os
import uuid

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Store for active speedtest sessions
active_speedtests = {}

def parse_speedtest_file(file_path):
    """Parse the speedtest results file and return structured data"""
    data = []
    
    if not os.path.exists(file_path):
        return data
    
    try:
        with open(file_path, 'r') as file:
            content = file.read()
            
        entries = content.split('============================================')
        
        for entry in entries:
            if not entry.strip():
                continue
                
            parsed_entry = parse_entry(entry.strip())
            if parsed_entry:
                data.append(parsed_entry)
        
        # Sort by timestamp
        data.sort(key=lambda x: x.get('timestamp', ''))
        
    except Exception as e:
        print(f"Error parsing speedtest file: {e}")
    
    return data

def parse_entry(entry):
    """Parse a single speedtest entry"""
    lines = entry.split('\n')
    result = {}
    
    # Find timestamp
    timestamp_line = next((line for line in lines if 'Timestamp:' in line), None)
    if not timestamp_line:
        return None
    
    try:
        timestamp_str = timestamp_line.split('Timestamp:')[1].strip()
        result['timestamp'] = timestamp_str
        result['datetime'] = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except:
        return None
    
    # Parse other fields
    for line in lines:
        line = line.strip()
        
        if 'Server:' in line:
            result['server'] = line.split('Server:')[1].strip()
        elif 'ISP:' in line:
            result['isp'] = line.split('ISP:')[1].strip()
        elif 'Download:' in line:
            try:
                download_match = re.search(r'Download:\s*([\d.]+)', line)
                if download_match:
                    result['downloadSpeed'] = float(download_match.group(1))
            except:
                result['downloadSpeed'] = None
        elif 'Upload:' in line:
            try:
                upload_match = re.search(r'Upload:\s*([\d.]+)', line)
                if upload_match:
                    result['uploadSpeed'] = float(upload_match.group(1))
            except:
                result['uploadSpeed'] = None
        elif 'Idle Latency:' in line:
            try:
                latency_match = re.search(r'Idle Latency:\s*([\d.]+)', line)
                if latency_match:
                    result['latency'] = float(latency_match.group(1))
            except:
                result['latency'] = None
        elif 'Jitter:' in line:
            try:
                jitter_match = re.search(r'Jitter:\s*([\d.]+)', line)
                if jitter_match:
                    result['jitter'] = float(jitter_match.group(1))
            except:
                result['jitter'] = None
        elif 'Wi-Fi Name:' in line:
            result['wifiName'] = line.split('Wi-Fi Name:')[1].strip()
        elif 'WiFi Name:' in line:
            result['wifiName'] = line.split('WiFi Name:')[1].strip()
        elif 'Interface:' in line:
            result['interface'] = line.split('Interface:')[1].strip()
        elif 'Connection Type:' in line:
            # Fallback for interface detection
            conn_type = line.split('Connection Type:')[1].strip()
            if not result.get('interface'):
                result['interface'] = conn_type
    
    # Set default interface if not found
    if 'interface' not in result:
        if result.get('wifiName'):
            result['interface'] = 'WiFi'
        else:
            result['interface'] = 'Ethernet'
    
    # Check for errors
    result['hasError'] = result.get('downloadSpeed') is None
    
    return result

@app.route('/api/speedtest-data')
def get_speedtest_data():
    """Get all speedtest data"""
    # Look for the speedtest file - try multiple locations
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found',
            'data': [],
            'total': 0
        })
    data = parse_speedtest_file(file_path)
    
    return jsonify({
        'success': True,
        'data': data,
        'total': len(data)
    })

@app.route('/api/speedtest-stats')
def get_speedtest_stats():
    """Get statistical overview of speedtest data"""
    # Look for the speedtest file - try multiple locations
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found'
        })
    data = parse_speedtest_file(file_path)
    
    if not data:
        return jsonify({
            'success': True,
            'stats': {}
        })
    
    valid_tests = [t for t in data if not t.get('hasError') and t.get('downloadSpeed') is not None]
    
    stats = {
        'totalTests': len(data),
        'validTests': len(valid_tests),
        'failedTests': len(data) - len(valid_tests),
        'successRate': (len(valid_tests) / len(data) * 100) if data else 0
    }
    
    if valid_tests:
        download_speeds = [t['downloadSpeed'] for t in valid_tests]
        upload_speeds = [t.get('uploadSpeed', 0) for t in valid_tests]
        latencies = [t.get('latency', 0) for t in valid_tests if t.get('latency')]
        
        stats.update({
            'avgDownload': sum(download_speeds) / len(download_speeds),
            'maxDownload': max(download_speeds),
            'minDownload': min(download_speeds),
            'avgUpload': sum(upload_speeds) / len(upload_speeds) if upload_speeds else 0,
            'maxUpload': max(upload_speeds) if upload_speeds else 0,
            'minUpload': min(upload_speeds) if upload_speeds else 0,
            'avgLatency': sum(latencies) / len(latencies) if latencies else 0,
            'maxLatency': max(latencies) if latencies else 0,
            'minLatency': min(latencies) if latencies else 0,
        })
    
    return jsonify({
        'success': True,
        'stats': stats
    })

@app.route('/api/speedtest-daily')
def get_daily_stats():
    """Get daily aggregated statistics"""
    # Look for the speedtest file - try multiple locations
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found'
        })
    data = parse_speedtest_file(file_path)
    
    daily_stats = {}
    
    for test in data:
        if test.get('hasError') or not test.get('downloadSpeed'):
            continue
            
        date = test['timestamp'][:10]  # YYYY-MM-DD
        
        if date not in daily_stats:
            daily_stats[date] = {
                'date': date,
                'tests': [],
                'download_speeds': [],
                'upload_speeds': [],
                'latencies': []
            }
        
        daily_stats[date]['tests'].append(test)
        daily_stats[date]['download_speeds'].append(test['downloadSpeed'])
        
        if test.get('uploadSpeed'):
            daily_stats[date]['upload_speeds'].append(test['uploadSpeed'])
        
        if test.get('latency'):
            daily_stats[date]['latencies'].append(test['latency'])
    
    # Calculate averages
    result = []
    for date, stats in daily_stats.items():
        day_stats = {
            'date': date,
            'testCount': len(stats['tests']),
            'avgDownload': sum(stats['download_speeds']) / len(stats['download_speeds']),
            'maxDownload': max(stats['download_speeds']),
            'minDownload': min(stats['download_speeds']),
            'avgUpload': sum(stats['upload_speeds']) / len(stats['upload_speeds']) if stats['upload_speeds'] else 0,
            'avgLatency': sum(stats['latencies']) / len(stats['latencies']) if stats['latencies'] else 0,
        }
        result.append(day_stats)
    
    # Sort by date
    result.sort(key=lambda x: x['date'])
    
    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/filters/networks')
def get_available_networks():
    """Get all unique WiFi networks (SSIDs) from speedtest data"""
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found',
            'networks': []
        })
    
    data = parse_speedtest_file(file_path)
    
    # Extract unique networks
    networks = set()
    for test in data:
        wifi_name = test.get('wifiName')
        if wifi_name and wifi_name.strip():
            networks.add(wifi_name.strip())
    
    # Sort networks alphabetically
    sorted_networks = sorted(list(networks))
    
    return jsonify({
        'success': True,
        'networks': sorted_networks,
        'count': len(sorted_networks)
    })

@app.route('/api/filters/interfaces')
def get_available_interfaces():
    """Get all unique network interfaces from speedtest data"""
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found',
            'interfaces': []
        })
    
    data = parse_speedtest_file(file_path)
    
    # Extract unique interfaces (we'll need to add interface parsing to parse_entry)
    interfaces = set()
    for test in data:
        interface = test.get('interface', 'Unknown')
        if interface and interface.strip():
            interfaces.add(interface.strip())
    
    # Sort interfaces alphabetically
    sorted_interfaces = sorted(list(interfaces))
    
    return jsonify({
        'success': True,
        'interfaces': sorted_interfaces,
        'count': len(sorted_interfaces)
    })

@app.route('/api/speedtest-data-filtered')
def get_filtered_speedtest_data():
    """Get speedtest data with network and interface filters"""
    # Get query parameters
    network_filter = request.args.get('network', None)  # SSID filter
    interface_filter = request.args.get('interface', None)  # Interface filter
    
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    if not file_path:
        return jsonify({
            'success': False,
            'error': 'Speedtest data file not found',
            'data': [],
            'total': 0
        })
    
    data = parse_speedtest_file(file_path)
    
    # Apply filters
    filtered_data = data
    
    if network_filter and network_filter != 'all':
        filtered_data = [test for test in filtered_data 
                        if test.get('wifiName', '').strip() == network_filter]
    
    if interface_filter and interface_filter != 'all':
        filtered_data = [test for test in filtered_data 
                        if test.get('interface', 'Unknown').strip() == interface_filter]
    
    return jsonify({
        'success': True,
        'data': filtered_data,
        'total': len(filtered_data),
        'filters_applied': {
            'network': network_filter,
            'interface': interface_filter
        }
    })

@app.route('/api/speedtest-run', methods=['POST'])
def run_speedtest():
    """Start a new speedtest"""
    test_id = str(uuid.uuid4())
    
    # Initialize test session
    active_speedtests[test_id] = {
        'status': 'starting',
        'progress': 0,
        'result': None,
        'error': None,
        'started_at': datetime.now().isoformat()
    }
    
    # Start speedtest in background
    thread = threading.Thread(target=execute_speedtest, args=(test_id,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        'success': True,
        'test_id': test_id,
        'message': 'Speedtest started'
    })

@app.route('/api/speedtest-status/<test_id>')
def get_speedtest_status(test_id):
    """Get the status of a running speedtest"""
    if test_id not in active_speedtests:
        return jsonify({
            'success': False,
            'error': 'Test ID not found'
        }), 404
    
    return jsonify({
        'success': True,
        'status': active_speedtests[test_id]
    })

@app.route('/api/speedtest-compare', methods=['POST'])
def compare_speedtest():
    """Compare current speedtest with historical data"""
    data = request.get_json()
    current_result = data.get('current_result')
    
    if not current_result:
        return jsonify({
            'success': False,
            'error': 'No current result provided'
        })
    
    # Get historical data for comparison
    file_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.speedtest_res.txt'),
        '/home/aparichit/.speedtest_res.txt',
        os.path.expanduser('~/.speedtest_res.txt')
    ]
    
    file_path = None
    for path in file_paths:
        if os.path.exists(path):
            file_path = path
            break
    
    historical_data = []
    if file_path:
        historical_data = parse_speedtest_file(file_path)
    
    # Perform comparative analysis
    comparison = perform_comparison_analysis(current_result, historical_data)
    
    return jsonify({
        'success': True,
        'comparison': comparison
    })

def execute_speedtest(test_id):
    """Execute speedtest command and update session"""
    try:
        active_speedtests[test_id]['status'] = 'running'
        active_speedtests[test_id]['progress'] = 25
        
        # Run speedtest command
        result = subprocess.run(
            ['speedtest', '--accept-license', '--accept-gdpr', '--format=json'],
            capture_output=True,
            text=True,
            timeout=120  # 2 minute timeout
        )
        
        active_speedtests[test_id]['progress'] = 75
        
        if result.returncode == 0:
            # Parse JSON result
            speedtest_data = json.loads(result.stdout)
            
            # Convert to our format
            formatted_result = {
                'timestamp': datetime.now().isoformat(),
                'downloadSpeed': speedtest_data['download']['bandwidth'] * 8 / 1_000_000,  # Convert to Mbps
                'uploadSpeed': speedtest_data['upload']['bandwidth'] * 8 / 1_000_000,     # Convert to Mbps
                'latency': speedtest_data['ping']['latency'],
                'jitter': speedtest_data['ping']['jitter'],
                'server': f"{speedtest_data['server']['name']} - {speedtest_data['server']['location']} (id: {speedtest_data['server']['id']})",
                'isp': speedtest_data['isp'],
                'hasError': False,
                'raw_data': speedtest_data
            }
            
            active_speedtests[test_id]['status'] = 'completed'
            active_speedtests[test_id]['progress'] = 100
            active_speedtests[test_id]['result'] = formatted_result
            
        else:
            active_speedtests[test_id]['status'] = 'error'
            active_speedtests[test_id]['error'] = result.stderr or 'Speedtest failed'
            
    except subprocess.TimeoutExpired:
        active_speedtests[test_id]['status'] = 'error'
        active_speedtests[test_id]['error'] = 'Speedtest timed out'
    except Exception as e:
        active_speedtests[test_id]['status'] = 'error'
        active_speedtests[test_id]['error'] = str(e)

def perform_comparison_analysis(current_result, historical_data):
    """Perform comparative analysis between current and historical results"""
    if not historical_data:
        return {
            'message': 'No historical data available for comparison',
            'current': current_result
        }
    
    # Filter valid historical tests
    valid_historical = [t for t in historical_data if not t.get('hasError') and t.get('downloadSpeed')]
    
    if not valid_historical:
        return {
            'message': 'No valid historical data for comparison',
            'current': current_result
        }
    
    # Calculate historical averages
    historical_download = [t['downloadSpeed'] for t in valid_historical]
    historical_upload = [t.get('uploadSpeed', 0) for t in valid_historical if t.get('uploadSpeed')]
    historical_latency = [t.get('latency', 0) for t in valid_historical if t.get('latency')]
    
    avg_download = sum(historical_download) / len(historical_download)
    avg_upload = sum(historical_upload) / len(historical_upload) if historical_upload else 0
    avg_latency = sum(historical_latency) / len(historical_latency) if historical_latency else 0
    
    # Calculate percentiles
    sorted_download = sorted(historical_download)
    sorted_upload = sorted(historical_upload) if historical_upload else [0]
    sorted_latency = sorted(historical_latency) if historical_latency else [0]
    
    def percentile(data, p):
        if not data:
            return 0
        k = (len(data) - 1) * p / 100
        f = int(k)
        c = k - f
        if f == len(data) - 1:
            return data[f]
        return data[f] * (1 - c) + data[f + 1] * c
    
    # Performance comparison
    current_download = current_result.get('downloadSpeed', 0)
    current_upload = current_result.get('uploadSpeed', 0)
    current_latency = current_result.get('latency', 0)
    
    download_percentile = len([d for d in historical_download if d <= current_download]) / len(historical_download) * 100
    upload_percentile = len([u for u in historical_upload if u <= current_upload]) / len(historical_upload) * 100 if historical_upload else 0
    latency_percentile = len([l for l in historical_latency if l >= current_latency]) / len(historical_latency) * 100 if historical_latency else 0
    
    # Recent comparison (last 10 tests)
    recent_tests = valid_historical[-10:]
    recent_avg_download = sum(t['downloadSpeed'] for t in recent_tests) / len(recent_tests)
    recent_avg_upload = sum(t.get('uploadSpeed', 0) for t in recent_tests) / len(recent_tests)
    recent_avg_latency = sum(t.get('latency', 0) for t in recent_tests) / len(recent_tests)
    
    # Time-based comparison (same hour)
    current_hour = datetime.now().hour
    same_hour_tests = [t for t in valid_historical if datetime.fromisoformat(t['timestamp'].replace('Z', '+00:00')).hour == current_hour]
    
    same_hour_comparison = None
    if same_hour_tests:
        same_hour_avg_download = sum(t['downloadSpeed'] for t in same_hour_tests) / len(same_hour_tests)
        same_hour_comparison = {
            'hour': current_hour,
            'test_count': len(same_hour_tests),
            'avg_download': same_hour_avg_download,
            'comparison': 'better' if current_download > same_hour_avg_download else 'worse' if current_download < same_hour_avg_download else 'same'
        }
    
    return {
        'current': current_result,
        'historical_summary': {
            'total_tests': len(valid_historical),
            'avg_download': avg_download,
            'avg_upload': avg_upload,
            'avg_latency': avg_latency,
            'max_download': max(historical_download),
            'min_download': min(historical_download),
            'p95_download': percentile(sorted_download, 95),
            'p50_download': percentile(sorted_download, 50)
        },
        'performance_percentiles': {
            'download': download_percentile,
            'upload': upload_percentile,
            'latency': latency_percentile
        },
        'recent_comparison': {
            'recent_avg_download': recent_avg_download,
            'recent_avg_upload': recent_avg_upload,
            'recent_avg_latency': recent_avg_latency,
            'download_change': ((current_download - recent_avg_download) / recent_avg_download * 100) if recent_avg_download > 0 else 0,
            'upload_change': ((current_upload - recent_avg_upload) / recent_avg_upload * 100) if recent_avg_upload > 0 else 0
        },
        'same_hour_comparison': same_hour_comparison,
        'insights': generate_insights(current_result, avg_download, avg_upload, avg_latency, download_percentile, upload_percentile, latency_percentile)
    }

def generate_insights(current, avg_download, avg_upload, avg_latency, download_perc, upload_perc, latency_perc):
    """Generate human-readable insights"""
    insights = []
    
    current_download = current.get('downloadSpeed', 0)
    current_upload = current.get('uploadSpeed', 0)
    current_latency = current.get('latency', 0)
    
    # Download insights
    if download_perc >= 90:
        insights.append(f"Excellent! Your download speed ({current_download:.1f} Mbps) is in the top 10% of your tests.")
    elif download_perc >= 75:
        insights.append(f"Good performance! Your download speed is above 75% of your previous tests.")
    elif download_perc <= 25:
        insights.append(f"Your download speed ({current_download:.1f} Mbps) is below your usual performance.")
    else:
        insights.append(f"Your download speed ({current_download:.1f} Mbps) is typical for your connection.")
    
    # Upload insights
    if upload_perc >= 90:
        insights.append(f"Outstanding upload speed ({current_upload:.1f} Mbps)!")
    elif upload_perc <= 25:
        insights.append(f"Upload speed ({current_upload:.1f} Mbps) is lower than usual.")
    
    # Latency insights
    if latency_perc >= 90:
        insights.append(f"Excellent latency ({current_latency:.0f}ms) - great for gaming and video calls!")
    elif latency_perc <= 25:
        insights.append(f"Higher than usual latency ({current_latency:.0f}ms) - may affect real-time activities.")
    
    # Overall performance
    avg_percentile = (download_perc + upload_perc + latency_perc) / 3
    if avg_percentile >= 80:
        insights.append("Overall excellent connection performance!")
    elif avg_percentile <= 30:
        insights.append("Consider checking your connection - performance is below average.")
    
    return insights

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
