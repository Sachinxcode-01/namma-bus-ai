sealed class ApiResult<T> {
  const ApiResult();

  bool get isSuccess => this is ApiSuccess<T>;
  bool get isFailure => this is ApiFailure<T>;

  T? get dataOrNull => switch (this) {
        ApiSuccess(:final data) => data,
        ApiFailure() => null,
      };

  String? get errorOrNull => switch (this) {
        ApiSuccess() => null,
        ApiFailure(:final message) => message,
      };

  R when<R>({
    required R Function(T data) success,
    required R Function(String message, int? statusCode) failure,
  }) {
    return switch (this) {
      ApiSuccess(:final data) => success(data),
      ApiFailure(:final message, :final statusCode) => failure(message, statusCode),
    };
  }
}

final class ApiSuccess<T> extends ApiResult<T> {
  final T data;
  final int statusCode;

  const ApiSuccess(this.data, {this.statusCode = 200});
}

final class ApiFailure<T> extends ApiResult<T> {
  final String message;
  final int? statusCode;
  final dynamic error;

  const ApiFailure(this.message, {this.statusCode, this.error});
}
