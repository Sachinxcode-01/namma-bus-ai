import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'package:http/http.dart' as http;
import '../constants/api_endpoints.dart';
import '../constants/app_constants.dart';
import 'api_result.dart';

/// Clean HTTP Client boundary for Sachin's backend API integration
class ApiHttpClient {
  final String baseUrl;
  final http.Client _client;
  String? _accessToken;

  ApiHttpClient({
    String? baseUrl,
    http.Client? client,
  })  : baseUrl = baseUrl ?? ApiEndpoints.defaultBaseUrl,
        _client = client ?? http.Client();

  void setAccessToken(String? token) {
    _accessToken = token;
  }

  String? get accessToken => _accessToken;

  Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-ID': 'req_${Random().nextInt(999999).toRadixString(36)}',
    };
    if (_accessToken != null && _accessToken!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  Future<ApiResult<T>> get<T>({
    required String path,
    required T Function(dynamic json) parser,
    Map<String, String>? queryParams,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$path').replace(queryParameters: queryParams);
      final response = await _client
          .get(uri, headers: _buildHeaders())
          .timeout(AppConstants.networkTimeout);

      return _handleResponse(response, parser);
    } on SocketException {
      return const ApiFailure(message: 'Cannot reach bus server. Please check your internet connection.');
    } on http.ClientException {
      return const ApiFailure(message: 'Connection interrupted. Please retry.');
    } catch (e) {
      return ApiFailure(message: 'Network error: ${e.toString()}');
    }
  }

  Future<ApiResult<T>> post<T>({
    required String path,
    required dynamic body,
    required T Function(dynamic json) parser,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl$path');
      final response = await _client
          .post(uri, headers: _buildHeaders(), body: jsonEncode(body))
          .timeout(AppConstants.networkTimeout);

      return _handleResponse(response, parser);
    } on SocketException {
      return const ApiFailure(message: 'Cannot reach bus server. Please check your internet connection.');
    } catch (e) {
      return ApiFailure(message: 'Network error: ${e.toString()}');
    }
  }

  ApiResult<T> _handleResponse<T>(http.Response response, T Function(dynamic json) parser) {
    try {
      final dynamic decoded = jsonDecode(response.body);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (decoded is Map<String, dynamic> && decoded.containsKey('data')) {
          return ApiSuccess(parser(decoded['data']));
        }
        return ApiSuccess(parser(decoded));
      } else {
        String errorMsg = 'Server error (${response.statusCode})';
        String? errorCode;
        if (decoded is Map<String, dynamic> && decoded.containsKey('error')) {
          final errorObj = decoded['error'];
          if (errorObj is Map<String, dynamic>) {
            errorMsg = errorObj['message']?.toString() ?? errorMsg;
            errorCode = errorObj['code']?.toString();
          } else if (errorObj is String) {
            errorMsg = errorObj;
          }
        }
        return ApiFailure(
          message: errorMsg,
          code: errorCode,
          statusCode: response.statusCode,
        );
      }
    } catch (e) {
      return ApiFailure(
        message: 'Invalid server response (${response.statusCode})',
        statusCode: response.statusCode,
      );
    }
  }

  void dispose() {
    _client.close();
  }
}
