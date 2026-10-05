import 'package:flutter/foundation.dart';
import '../data/models/bus_model.dart';
import '../data/models/route_model.dart';
import '../data/models/stop_model.dart';
import '../data/repositories/transport_repository.dart';

class TransportController extends ChangeNotifier {
  final TransportRepository _transportRepository;

  List<BusEntity> _buses = [];
  List<RouteEntity> _routes = [];
  List<StopEntity> _stops = [];

  String? _selectedBusId;
  String? _selectedRouteId;
  String? _selectedStopId;

  bool _isLoading = false;
  String? _errorMessage;
  bool _is10MinAlertEnabled = true;

  TransportController({required TransportRepository transportRepository})
      : _transportRepository = transportRepository;

  List<BusEntity> get buses => _buses;
  List<RouteEntity> get routes => _routes;
  List<StopEntity> get stops => _stops;

  String? get selectedBusId => _selectedBusId;
  String? get selectedRouteId => _selectedRouteId;
  String? get selectedStopId => _selectedStopId;

  BusEntity? get selectedBus {
    if (_buses.isEmpty) return null;
    return _buses.firstWhere(
      (b) => b.id == _selectedBusId,
      orElse: () => _buses.first,
    );
  }

  RouteEntity? get selectedRoute {
    if (_routes.isEmpty) return null;
    return _routes.firstWhere(
      (r) => r.id == _selectedRouteId,
      orElse: () => _routes.first,
    );
  }

  StopEntity? get selectedStop {
    if (_stops.isEmpty) return null;
    return _stops.firstWhere(
      (s) => s.id == _selectedStopId,
      orElse: () => _stops.first,
    );
  }

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get is10MinAlertEnabled => _is10MinAlertEnabled;

  Future<void> loadTransportData() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final busResult = await _transportRepository.getBuses();
      final routeResult = await _transportRepository.getRoutes();
      final stopResult = await _transportRepository.getStops();

      if (busResult.isSuccess) {
        _buses = busResult.dataOrNull ?? [];
        if (_buses.isNotEmpty && _selectedBusId == null) {
          _selectedBusId = _buses.first.id;
        }
      }

      if (routeResult.isSuccess) {
        _routes = routeResult.dataOrNull ?? [];
        if (_routes.isNotEmpty && _selectedRouteId == null) {
          _selectedRouteId = _routes.first.id;
        }
      }

      if (stopResult.isSuccess) {
        _stops = stopResult.dataOrNull ?? [];
        if (_stops.isNotEmpty && _selectedStopId == null) {
          // Default to student's stop: Engineering Annex (Stop 3) or first
          _selectedStopId = _stops.length > 2 ? _stops[2].id : _stops.first.id;
        }
      }

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'Failed to load transport routes: $e';
      notifyListeners();
    }
  }

  void selectBus(String busId) {
    if (_selectedBusId != busId) {
      _selectedBusId = busId;
      notifyListeners();
    }
  }

  void selectRoute(String routeId) {
    if (_selectedRouteId != routeId) {
      _selectedRouteId = routeId;
      notifyListeners();
    }
  }

  void selectStop(String stopId) {
    if (_selectedStopId != stopId) {
      _selectedStopId = stopId;
      notifyListeners();
    }
  }

  void toggle10MinAlert(bool enabled) {
    if (_is10MinAlertEnabled != enabled) {
      _is10MinAlertEnabled = enabled;
      notifyListeners();
    }
  }
}
