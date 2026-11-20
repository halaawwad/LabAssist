import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
@Catch()
export class ApiErrors implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const requestId = host.switchToHttp().getRequest().requestId;
    if (error instanceof HttpException) {
      const detail = error.getResponse();
      return res.status(error.getStatus()).json({
        statusCode: error.getStatus(),
        ...(typeof detail === "string" ? { message: detail } : detail),
        requestId,
      });
    }
    const code = error?.meta?.code;
    if (code === "23505" || error?.code === "P2002")
      return res.status(409).json({
        statusCode: 409,
        requestId,
        message: "Account identity or active workshop manager already exists.",
      });
    if (code === "P0001" || code === "23514" || code === "23503")
      return res.status(400).json({
        statusCode: 400,
        requestId,
        message: "The account action is invalid, expired, or conflicts with an existing rule.",
      });
    res
      .status(500)
      .json({
        statusCode: 500,
        requestId,
        message: "The request could not be completed. Please retry.",
      });
  }
}
