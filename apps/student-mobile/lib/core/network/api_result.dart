/// Functional result envelope for network and repository operations
sealed class ApiResult<T> {
  const ApiResult();

  bool get isSuccess => this is ApiSuccess<T>;
  bool get isFailure => this is ApiFailure<T>;

  T? get dataOrNull => switch (this) {
        ApiSuccess(data: final data) => data,
        ApiFailure() => null,
      };

  String? get errorOrNull => switch (this) {
        ApiSuccess() => null,
        ApiFailure(message: final msg) => msg,
      };
}

final class ApiSuccess<T> extends ApiResult<T> {
  final T data;
  const ApiSuccess(this.data);
}

final class ApiFailure<T> extends ApiResult<T> {
  final String message;
  final String? code;
  final int? statusCode;

  const ApiFailure({
    required this.message,
    this.code,
    this.statusCode,
  });
}
