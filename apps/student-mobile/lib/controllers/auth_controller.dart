import 'package:flutter/foundation.dart';
import '../data/models/user_model.dart';
import '../data/repositories/auth_repository.dart';

class AuthController extends ChangeNotifier {
  final AuthRepository _authRepository;

  UserProfile? _user;
  bool _isLoading = false;
  String? _errorMessage;

  AuthController({required AuthRepository authRepository}) : _authRepository = authRepository;

  UserProfile? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _user != null;

  Future<bool> checkSession() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepository.checkSession();
    _isLoading = false;

    if (result.isSuccess) {
      _user = result.dataOrNull;
      notifyListeners();
      return true;
    }

    _user = null;
    notifyListeners();
    return false;
  }

  Future<bool> login({required String email, required String password}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await _authRepository.login(email: email, password: password);
    _isLoading = false;

    if (result.isSuccess) {
      _user = result.dataOrNull;
      _errorMessage = null;
      notifyListeners();
      return true;
    } else {
      _errorMessage = result.errorOrNull ?? 'Authentication failed';
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _isLoading = true;
    notifyListeners();

    await _authRepository.logout();
    _user = null;
    _isLoading = false;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    if (_errorMessage != null) {
      _errorMessage = null;
      notifyListeners();
    }
  }
}
