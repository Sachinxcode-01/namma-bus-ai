import { GlobalExceptionsFilter } from './global-exceptions.filter';
import { ArgumentsHost, HttpStatus, HttpException } from '@nestjs/common';
import { AppException } from '../errors/app.exception';
import { REQUEST_ID_HEADER } from '../constants';

describe('GlobalExceptionsFilter', () => {
  let filter: GlobalExceptionsFilter;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;
  let mockResponse: { status: jest.Mock };
  let mockRequest: {
    headers: Record<string, string>;
    method: string;
    url: string;
    id?: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionsFilter();
    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = { status: mockStatus };
    mockRequest = {
      headers: { [REQUEST_ID_HEADER]: 'test-req-id' },
      method: 'GET',
      url: '/test',
      id: 'test-req-id',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format AppException with standard error structure', () => {
    const appException = new AppException(
      'TRIP_NOT_ACTIVE',
      'The requested trip is not active.',
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(appException, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'TRIP_NOT_ACTIVE',
        message: 'The requested trip is not active.',
        requestId: 'test-req-id',
      },
    });
  });

  it('should format standard HttpException properly', () => {
    const httpException = new HttpException('Forbidden resource', HttpStatus.FORBIDDEN);

    filter.catch(httpException, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Forbidden resource',
        requestId: 'test-req-id',
      },
    });
  });

  it('should mask internal error message for 500 unhandled errors', () => {
    const internalError = new Error('Database password leak or raw error');

    filter.catch(internalError, mockHost);

    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal server error occurred.',
        requestId: 'test-req-id',
      },
    });
  });
});
