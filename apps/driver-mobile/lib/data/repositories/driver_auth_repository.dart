import '../../core/constants/api_endpoints.dart';
import '../../core/constants/app_constants.dart';
import '../../core/network/api_result.dart';
import '../../core/network/http_client.dart';
import '../mock/mock_driver_data.dart';
import '../models/driver_user_model.dart';

abstract class IDriverAuthRepository {
  Future<ApiResult<DriverUserModel>> login({
    required String email,
    required String password,
  });

  Future<ApiResult<bool>> logout();

  DriverUserModel? get currentDriver;
  bool get isAuthenticated;
}

class DriverAuthRepository implements IDriverAuthRepository {
  final ApiClient _client;
  DriverUserModel? _currentDriver;

  DriverAuthRepository({required ApiClient client}) : _client = client;

  @override
  DriverUserModel? get currentDriver => _currentDriver;

  @override
  bool get isAuthenticated => _currentDriver != null;

  @override
  Future<ApiResult<DriverUserModel>> login({
    required String email,
    required String password,
  }) async {
    // 1. Try real backend
    final result = await _client.post<DriverUserModel>(
      ApiEndpoints.login,
      body: {'email': email, 'password': password},
      parser: (json) => DriverUserModel.fromJson(json),
    );

    if (result is ApiSuccess<DriverUserModel>) {
      _currentDriver = result.data;
      return result;
    }

    // 2. Demo credentials fallback if server is offline or mock credentials used
    if (email.trim().toLowerCase() == AppConstants.demoEmail &&
        password == AppConstants.demoPassword) {
      _currentDriver = MockDriverData.mockDriver;
      _client.setAuthToken('mock_driver_jwt_token_ramesh');
      return ApiSuccess(_currentDriver!);
    }

    // Return the failure from backend
    return result;
  }

  @override
  Future<ApiResult<bool>> logout() async {
    await _client.post<bool>(
      ApiEndpoints.logout,
      parser: (_) => true,
    );
    _currentDriver = null;
    _client.setAuthToken(null);
    return const ApiSuccess(true);
  }
}
