import 'package:flutter/foundation.dart';
import '../data/models/driver_user_model.dart';
import '../data/repositories/driver_auth_repository.dart';

class DriverAuthController extends ChangeNotifier {
  final IDriverAuthRepository _authRepo;

  bool _isLoading = false;
  String? _errorMessage;
  DriverUserModel? _driver;

  DriverAuthController({required IDriverAuthRepository authRepo})
      : _authRepo = authRepo,
        _driver = authRepo.currentDriver;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DriverUserModel? get driver => _driver;
  bool get isAuthenticated => _driver != null;

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepo.login(email: email, password: password);

    _isLoading = false;
    return result.when(
      success: (user) {
        _driver = user;
        _errorMessage = null;
        notifyListeners();
        return true;
      },
      failure: (message, _) {
        _errorMessage = message;
        notifyListeners();
        return false;
      },
    );
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _authRepo.logout();
    _driver = null;
    _errorMessage = null;
    _isLoading = false;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
