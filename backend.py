
# from flask import Flask, render_template, jsonify, request
# from twilio.rest import Client

# app = Flask(__name__)
# account_sid = 'AC5929f53f3941804d8182d2834ef0235d'
# auth_token = '61eb9dda537f2be9ab7994030df14b4d'
# client = Client(account_sid, auth_token)

# @app.route('/')
# def home():
#     return render_template('index.html')

# @app.route('/send-message', methods=['POST'])
# def send_message():
#     try:
#         data = request.get_json()
#         user_msg = data.get('message', 'Default message')

#         message = client.messages.create(
#             from_='whatsapp:+14155238886',
#             body=user_msg,
#             to='whatsapp:+919424021296'
#         )
#         return jsonify({'status': 'success', 'sid': message.sid})
#     except Exception as e:
#         return jsonify({'status': 'error', 'error': str(e)})

# if __name__ == '__main__':
#     app.run(debug=True)



from flask import Flask, render_template, jsonify, request
from twilio.rest import Client
from datetime import datetime, timedelta
import threading
import time
import os
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Twilio configuration
account_sid = 'AC5929f53f3941804d8182d2834ef0235d'
auth_token = '61eb9dda537f2be9ab7994030df14b4d'
client = Client(account_sid, auth_token)

# Store notification history
notification_history = []

# Application state (simulating database)
app_state = {
    'poles': [
        {'id': 'P001', 'lat': 23.2599, 'lng': 77.4126, 'status': 'healthy', 'area': 'Awadhpuri Main Square'},
        {'id': 'P002', 'lat': 23.2632, 'lng': 77.4180, 'status': 'healthy', 'area': 'Sector A'},
        {'id': 'P003', 'lat': 23.2651, 'lng': 77.4205, 'status': 'healthy', 'area': 'Sector B'},
        {'id': 'P004', 'lat': 23.2670, 'lng': 77.4150, 'status': 'healthy', 'area': 'Sector C'},
        {'id': 'P005', 'lat': 23.2615, 'lng': 77.4190, 'status': 'healthy', 'area': 'Sector D'},
        {'id': 'P006', 'lat': 23.2580, 'lng': 77.4220, 'status': 'healthy', 'area': 'Sector E'},
        {'id': 'P007', 'lat': 23.2550, 'lng': 77.4170, 'status': 'healthy', 'area': 'Sector F'},
        {'id': 'P008', 'lat': 23.2620, 'lng': 77.4130, 'status': 'healthy', 'area': 'Sector G'},
        {'id': 'P009', 'lat': 23.2660, 'lng': 77.4100, 'status': 'healthy', 'area': 'Sector H'},
        {'id': 'P010', 'lat': 23.2690, 'lng': 77.4180, 'status': 'healthy', 'area': 'Sector I'}
    ],
    'lines': [
        {'id': 'L001', 'from': 'P001', 'to': 'P002', 'status': 'healthy'},
        {'id': 'L002', 'from': 'P002', 'to': 'P003', 'status': 'healthy'},
        {'id': 'L003', 'from': 'P003', 'to': 'P004', 'status': 'healthy'},
        {'id': 'L004', 'from': 'P004', 'to': 'P005', 'status': 'healthy'},
        {'id': 'L005', 'from': 'P005', 'to': 'P006', 'status': 'healthy'},
        {'id': 'L006', 'from': 'P006', 'to': 'P007', 'status': 'healthy'},
        {'id': 'L007', 'from': 'P007', 'to': 'P008', 'status': 'healthy'},
        {'id': 'L008', 'from': 'P008', 'to': 'P009', 'status': 'healthy'},
        {'id': 'L009', 'from': 'P009', 'to': 'P010', 'status': 'healthy'},
        {'id': 'L010', 'from': 'P010', 'to': 'P001', 'status': 'healthy'}
    ],
    'vans': [
        {'id': 'van01', 'name': 'Van 01 - Repair Team Alpha', 'status': 'available', 'currentPole': 'P001', 'driver': 'Rajesh Kumar'},
        {'id': 'van02', 'name': 'Van 02 - Repair Team Beta', 'status': 'available', 'currentPole': 'P003', 'driver': 'Mohan Singh'}
    ],
    'active_repairs': []
}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/state')
def get_state():
    """Get current application state"""
    return jsonify(app_state)

@app.route('/api/update-line-status', methods=['POST'])
def update_line_status():
    """Update line status and send notification"""
    try:
        data = request.get_json()
        line_id = data.get('line_id')
        status = data.get('status')
        
        # Find and update the line
        for line in app_state['lines']:
            if line['id'] == line_id:
                line['status'] = status
                break
        
        # Update pole statuses
        update_pole_statuses()
        
        # Prepare notification message
        message = ""
        if status == 'fault':
            message = f"🚨 FAULT ALERT: Line {line_id} has a fault. Repair team dispatched."
        elif status == 'repair':
            message = f"🔧 REPAIR STARTED: Line {line_id} repair underway."
        elif status == 'healthy':
            message = f"✅ REPAIR COMPLETED: Line {line_id} restored. Power supply back to normal."
        
        # Send WhatsApp notification
        if message:
            send_whatsapp_notification_internal(message)
        
        return jsonify({'status': 'success', 'message': f'Line {line_id} updated to {status}'})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

@app.route('/api/trigger-blackout', methods=['POST'])
def trigger_blackout():
    """Trigger blackout for a pole"""
    try:
        data = request.get_json()
        pole_id = data.get('pole_id')
        password = data.get('password')
        estimated_repair_time = data.get('estimated_repair_time', 60)  # Default 60 minutes
        break_reason = data.get('break_reason', 'Manual blackout')  # New field for reason
        
        if password != 'admin123':
            return jsonify({'status': 'error', 'error': 'Invalid password'})
        
        # Update lines connected to this pole
        for line in app_state['lines']:
            if line['from'] == pole_id or line['to'] == pole_id:
                line['status'] = 'fault'
        
        # Update pole statuses
        update_pole_statuses()
        
        # Find pole info
        pole = next((p for p in app_state['poles'] if p['id'] == pole_id), None)
        pole_area = pole['area'] if pole else 'Unknown area'
        
        # Add to active repairs
        repair_id = f"R{datetime.now().strftime('%Y%m%d%H%M%S')}"
        app_state['active_repairs'].append({
            'id': repair_id,
            'pole_id': pole_id,
            'pole_area': pole_area,
            'estimated_repair_time': estimated_repair_time,
            'start_time': datetime.now().isoformat(),
            'status': 'pending',
            'break_reason': break_reason  # Store the reason
        })
        
        # Send notification with reason
        message = f"⚡ MANUAL BLACKOUT: {break_reason} at {pole_id}, {pole_area}. Estimated repair time: {estimated_repair_time} minutes. Repair team notified."
        send_whatsapp_notification_internal(message)
        
        # Auto-dispatch a van if available
        auto_dispatch_van(pole_id, estimated_repair_time, break_reason)
        
        return jsonify({'status': 'success', 'message': f'Blackout triggered for {pole_id}', 'repair_id': repair_id})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

def auto_dispatch_van(pole_id, estimated_repair_time, break_reason):
    """Automatically dispatch an available van"""
    available_van = next((v for v in app_state['vans'] if v['status'] == 'available'), None)
    
    if available_van:
        available_van['status'] = 'dispatched'
        available_van['currentPole'] = pole_id
        
        # Find pole info
        pole = next((p for p in app_state['poles'] if p['id'] == pole_id), None)
        pole_area = pole['area'] if pole else 'Unknown area'
        
        # Send notification with reason
        message = f"🚐 VAN AUTO-DISPATCHED: {available_van['name']} en route to {pole_id} ({pole_area}) for {break_reason}. Estimated repair: {estimated_repair_time} minutes."
        send_whatsapp_notification_internal(message)
        
        # Simulate repair process
        threading.Thread(target=simulate_repair_process, args=(available_van['id'], pole_id, estimated_repair_time, break_reason)).start()

@app.route('/api/dispatch-van', methods=['POST'])
def dispatch_van():
    """Dispatch van to a pole"""
    try:
        data = request.get_json()
        van_id = data.get('van_id')
        pole_id = data.get('pole_id')
        estimated_repair_time = data.get('estimated_repair_time', 60)  # Default 60 minutes
        break_reason = data.get('break_reason', 'Fault repair')  # New field
        
        # Find and update van
        van = next((v for v in app_state['vans'] if v['id'] == van_id), None)
        if not van:
            return jsonify({'status': 'error', 'error': 'Van not found'})
        
        van['status'] = 'dispatched'
        van['currentPole'] = pole_id
        
        # Find pole info
        pole = next((p for p in app_state['poles'] if p['id'] == pole_id), None)
        pole_area = pole['area'] if pole else 'Unknown area'
        
        # Update lines to repair status - FIXED: This should happen immediately when van is dispatched
        for line in app_state['lines']:
            if line['from'] == pole_id or line['to'] == pole_id:
                if line['status'] == 'fault':  # Only update if it's already faulty
                    line['status'] = 'repair'
        
        update_pole_statuses()
        
        # Update active repair status
        active_repair = next((r for r in app_state['active_repairs'] if r['pole_id'] == pole_id and r['status'] == 'pending'), None)
        if active_repair:
            active_repair['status'] = 'in_progress'
            active_repair['van_id'] = van_id
            active_repair['estimated_repair_time'] = estimated_repair_time
            active_repair['break_reason'] = break_reason
        
        # Send notification
        message = f"🚐 VAN DISPATCHED: {van['name']} en route to {pole_id} ({pole_area}) for {break_reason}. Estimated repair: {estimated_repair_time} minutes."
        send_whatsapp_notification_internal(message)
        
        # Simulate repair process
        threading.Thread(target=simulate_repair_process, args=(van_id, pole_id, estimated_repair_time, break_reason)).start()
        
        return jsonify({'status': 'success', 'message': f'Van {van_id} dispatched to {pole_id}'})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

def simulate_repair_process(van_id, pole_id, estimated_repair_time, break_reason):
    """Simulate the repair process with delays"""
    # Convert estimated time to seconds (with acceleration for demo)
    travel_time = min(5, estimated_repair_time * 0.1)  # 10% of total time for travel, max 5 seconds
    repair_time = min(10, estimated_repair_time * 0.15)  # 15% of total time for repair, max 10 seconds
    
    time.sleep(travel_time)  # Van travel time
    
    # Update lines to repair status - FIXED: This should happen when van arrives
    for line in app_state['lines']:
        if line['from'] == pole_id or line['to'] == pole_id:
            if line['status'] == 'fault':  # Only update faulty lines
                line['status'] = 'repair'
    
    update_pole_statuses()
    
    # Update active repair status
    active_repair = next((r for r in app_state['active_repairs'] if r['pole_id'] == pole_id), None)
    if active_repair:
        active_repair['status'] = 'in_progress'
    
    # Find pole info
    pole = next((p for p in app_state['poles'] if p['id'] == pole_id), None)
    pole_area = pole['area'] if pole else 'Unknown area'
    
    # Send repair started notification
    message = f"🔧 REPAIR STARTED: Work begun at {pole_id} ({pole_area}) for {break_reason}. Repair in progress."
    send_whatsapp_notification_internal(message)
    
    time.sleep(repair_time)  # Repair time
    
    # Complete repair - FIXED: Lines should turn blue after repair
    for line in app_state['lines']:
        if line['from'] == pole_id or line['to'] == pole_id:
            line['status'] = 'healthy'
    
    # Update van status
    van = next((v for v in app_state['vans'] if v['id'] == van_id), None)
    if van:
        van['status'] = 'available'
        # Keep van at the repaired pole
        van['currentPole'] = pole_id
    
    # Update active repair status
    if active_repair:
        active_repair['status'] = 'completed'
        active_repair['completion_time'] = datetime.now().isoformat()
    
    update_pole_statuses()
    
    # Send completion notification
    message = f"✅ REPAIR COMPLETED: Power restored at {pole_id} ({pole_area}) after {break_reason}. System back to normal."
    send_whatsapp_notification_internal(message)

def update_pole_statuses():
    """Update pole status based on connected lines"""
    for pole in app_state['poles']:
        connected_lines = [line for line in app_state['lines'] 
                          if line['from'] == pole['id'] or line['to'] == pole['id']]
        
        if any(line['status'] == 'fault' for line in connected_lines):
            pole['status'] = 'fault'
        elif any(line['status'] == 'repair' for line in connected_lines):
            pole['status'] = 'repair'
        else:
            pole['status'] = 'healthy'

@app.route('/send-message', methods=['POST'])
def send_message():
    """Endpoint for manual message sending"""
    try:
        data = request.get_json()
        user_msg = data.get('message', 'Default message')

        message = client.messages.create(
            from_='whatsapp:+14155238886',
            body=user_msg,
            to='whatsapp:+919424021296'
        )
        
        # Log the notification
        notification_history.append({
            'timestamp': datetime.now().isoformat(),
            'message': user_msg,
            'type': 'manual',
            'status': 'sent'
        })
        
        return jsonify({'status': 'success', 'sid': message.sid})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)})

@app.route('/send-whatsapp', methods=['POST'])
def send_whatsapp_notification():
    """Endpoint for automated system notifications"""
    try:
        data = request.get_json()
        system_msg = data.get('message', 'System notification')
        timestamp = data.get('timestamp', datetime.now().isoformat())

        # Send WhatsApp message
        message = client.messages.create(
            from_='whatsapp:+14155238886',
            body=f"🔌 Awadhpuri Grid Alert\n{system_msg}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            to='whatsapp:+919424021296'
        )
        
        # Log the notification
        notification_history.append({
            'timestamp': timestamp,
            'message': system_msg,
            'type': 'system',
            'status': 'sent',
            'sid': message.sid
        })
        
        return jsonify({'status': 'success', 'sid': message.sid})
    except Exception as e:
        # Log failed notification
        notification_history.append({
            'timestamp': datetime.now().isoformat(),
            'message': system_msg,
            'type': 'system',
            'status': 'failed',
            'error': str(e)
        })
        return jsonify({'status': 'error', 'error': str(e)})

def send_whatsapp_notification_internal(message):
    """Internal function to send WhatsApp notifications"""
    try:
        # Send WhatsApp message
        client.messages.create(
            from_='whatsapp:+14155238886',
            body=f"🔌 Awadhpuri Grid Alert\n{message}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            to='whatsapp:+919424021296'
        )
        
        # Log the notification
        notification_history.append({
            'timestamp': datetime.now().isoformat(),
            'message': message,
            'type': 'system',
            'status': 'sent'
        })
    except Exception as e:
        # Log failed notification
        notification_history.append({
            'timestamp': datetime.now().isoformat(),
            'message': message,
            'type': 'system',
            'status': 'failed',
            'error': str(e)
        })

@app.route('/notifications')
def get_notifications():
    """Get notification history"""
    return jsonify({'notifications': notification_history})

@app.route('/api/active-repairs')
def get_active_repairs():
    """Get active repairs"""
    return jsonify({'active_repairs': app_state['active_repairs']})

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)