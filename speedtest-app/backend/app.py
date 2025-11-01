from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import json
import re
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

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
        elif 'WiFi Name:' in line:
            result['wifiName'] = line.split('WiFi Name:')[1].strip()
    
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
