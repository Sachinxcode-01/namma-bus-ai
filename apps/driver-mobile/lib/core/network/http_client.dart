import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';
import '../constants/app_constants.dart';
import 'api_result.dart';

class ApiClient {
  final http.Client _client;
  final String baseUrl;
  String? _authToken;

  ApiClient({
    http.Client? client,
    this.baseUrl = ApiEndpoints.defaultBaseUrl,
  }) : _client = client ?? http.Client();

  void setAuthToken(String? token) {
    _authToken = token;
  }

  String? get authToken => _authToken;

  Map<String, String> _buildHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Role': 'DRIVER',
      'X-App-Version': AppConstants.appVersion,
    };
    if (_authToken != null && _authToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_authToken';
    }
    return headers;
  }

  Future<ApiResult<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    return _send(
      () => _client.get(
        _buildUri(path, queryParameters),
        headers: _buildHeaders(),
      ),
      parser,
    );
  }

  Future<ApiResult<T>> post<T>(
    String path, {
    Map<String, dynamic>? body,
    required T Function(Map<String, dynamic> json) parser,
  }) async {
    return _send(
      () => _client.post(
        _buildUri(path),
        headers: _buildHeaders(),
        body: body != null ? jsonEncode(body) : null,
      ),
      parser,
    );
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParameters]) {
    final cleanPath = path.startsWith('/') ? path : '/$path';
    final fullUrl = '$baseUrl$cleanPath';
    final uri = Uri.parse(fullUrl);
    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(
        queryParameters: queryParameters.map(
          (key, value) => MapEntry(key, value?.toString() ?? ''),
        ),
      );
    }
    return uri;
  }

  Future<ApiResult<T>> _send<T>(
    Future<http.Response> Function() requestFn,
    T Function(Map<String, dynamic> json) parser,
  ) async {
    try {
      final response = await requestFn().timeout(AppConstants.networkTimeout);
      final statusCode = response.statusCode;

      if (statusCode >= 200 && statusCode < 300) {
        if (response.body.isEmpty) {
          return ApiSuccess(parser({}), statusCode: statusCode);
        }
        final dynamic decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          final data = decoded.containsKey('data') && decoded['data'] is Map<String, dynamic>
              ? decoded['data'] as Map<String, dynamic>
              : decoded;
          return ApiSuccess(parser(data), statusCode: statusCode);
        } else {
          return ApiSuccess(parser({'items': decoded}), statusCode: statusCode);
        }
      } else {
        String errorMessage = 'Server error ($statusCode)';
        try {
          final decoded = jsonDecode(response.body);
          if (decoded is Map<String, dynamic> && decoded.containsKey('message')) {
            errorMessage = decoded['message'].toString();
          }
        } catch (_) {}
        return ApiFailure(errorMessage, statusCode: statusCode);
      }
    } on SocketException {
      return const ApiFailure('No internet connection. Please check your network.', statusCode: null);
    } on TimeoutException {
      return const ApiFailure('Connection timed out. Retrying automatically...', statusCode: 408);
    } catch (e) {
      return ApiFailure('Unexpected error: $e', error: e);
    }
  }

  void dispose() {
    _client.close();
  }
}
