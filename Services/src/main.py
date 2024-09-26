from flask import Flask, jsonify, request
from vrp_solver import solve_vrp
import vrp_data

app = Flask(__name__)

@app.route('/vrp-solution', methods=['GET', 'POST', 'PUT', 'DELETE'])
def vrp_solution():
    try:
        if request.method == 'GET':
            result = solve_vrp()
            if result:
                return jsonify(result), 200
            else:
                return jsonify({'error': 'No solution found'}), 400

        elif request.method == 'POST':
            data = request.json
            vrp_data.locations.append(data['location'])
            vrp_data.time_windows.append(data['time_window'])
            vrp_data.service_times.append(data['service_time'])
            return jsonify({'message': 'Data added successfully'}), 201

        elif request.method == 'PUT':
            data = request.json
            index = data.get('index')
            if index is not None and 0 <= index < len(vrp_data.locations):
                vrp_data.locations[index] = data['location']
                vrp_data.time_windows[index] = data['time_window']
                vrp_data.service_times[index] = data['service_time']
                return jsonify({'message': 'Data updated successfully'}), 200
            else:
                return jsonify({'error': 'Index out of range or missing index'}), 400

        elif request.method == 'DELETE':
            data = request.json
            index = data.get('index')
            if index is not None and 0 <= index < len(vrp_data.locations):
                del vrp_data.locations[index]
                del vrp_data.time_windows[index]
                del vrp_data.service_times[index]
                return jsonify({'message': 'Data deleted successfully'}), 200
            else:
                return jsonify({'error': 'Index out of range or missing index'}), 400

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
