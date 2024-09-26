from ortools.constraint_solver import routing_enums_pb2
from ortools.constraint_solver import pywrapcp
from geopy.distance import geodesic
from datetime import datetime, timedelta
import vrp_data

def create_data_model():
    """Stores the data for the problem."""
    data = {}
    data['locations'] = vrp_data.locations
    data['time_windows'] = vrp_data.time_windows
    data['service_times'] = vrp_data.service_times
    data['distance_matrix'] = [
        [int(geodesic(loc1, loc2).miles * 10) for loc2 in data['locations']]
        for loc1 in data['locations']
    ]
    data['num_vehicles'] = 4
    data['depot'] = 0
    return data

def solve_vrp():
    """Solve the VRP with time windows."""
    data = create_data_model()
    manager = pywrapcp.RoutingIndexManager(len(data['distance_matrix']), 
                                           data['num_vehicles'], data['depot'])
    routing = pywrapcp.RoutingModel(manager)

    def time_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return data['distance_matrix'][from_node][to_node] + data['service_times'][from_node]

    transit_callback_index = routing.RegisterTransitCallback(time_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    time = 'Time'
    routing.AddDimension(
        transit_callback_index,
        30,  # allow waiting time
        1260,  # maximum time per vehicle
        False,  # Don't force start cumul to zero
        time)
    time_dimension = routing.GetDimensionOrDie(time)

    for location_idx, time_window in enumerate(data['time_windows']):
        index = manager.NodeToIndex(location_idx)
        time_dimension.CumulVar(index).SetRange(time_window[0], time_window[1])

    for i in range(data['num_vehicles']):
        routing.AddVariableMinimizedByFinalizer(
            time_dimension.CumulVar(routing.Start(i)))
        routing.AddVariableMinimizedByFinalizer(
            time_dimension.CumulVar(routing.End(i)))

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC)

    solution = routing.SolveWithParameters(search_parameters)

    if solution:
        return get_solution_details(data, manager, routing, solution)
    else:
        return None

def get_solution_details(data, manager, routing, solution):
    """Extract solution details."""
    time_dimension = routing.GetDimensionOrDie('Time')
    total_time = 0
    routes = []
    for vehicle_id in range(data['num_vehicles']):
        index = routing.Start(vehicle_id)
        route = []
        while not routing.IsEnd(index):
            time_var = time_dimension.CumulVar(index)
            node = manager.IndexToNode(index)
            route.append({
                'location': node,
                'arrival_time': solution.Min(time_var),
                'departure_time': solution.Min(time_var) + data['service_times'][node]
            })
            index = solution.Value(routing.NextVar(index))
        routes.append(route)
        total_time += solution.Min(time_dimension.CumulVar(index))
    
    return {
        'routes': routes,
        'total_time': total_time,
        'objective_value': solution.ObjectiveValue()
    }
