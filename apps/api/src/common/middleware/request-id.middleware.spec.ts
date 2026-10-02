import { RequestIdMiddleware } from './request-id.middleware';
import { Request, Response, NextFunction } from 'express';
import { REQUEST_ID_HEADER } from '../constants';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };
    nextFunction = jest.fn();
  });

  it('should generate a new request ID if none is supplied in headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    const generatedId = mockRequest.headers![REQUEST_ID_HEADER] as string;
    expect(generatedId).toBeDefined();
    expect(generatedId.startsWith('req_')).toBe(true);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, generatedId);
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should preserve and reuse an existing x-request-id header', () => {
    const customId = 'client-custom-req-12345';
    mockRequest.headers = {
      [REQUEST_ID_HEADER]: customId,
    };

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockRequest.headers[REQUEST_ID_HEADER]).toBe(customId);
    expect(mockResponse.setHeader).toHaveBeenCalledWith(REQUEST_ID_HEADER, customId);
    expect(nextFunction).toHaveBeenCalled();
  });
});
