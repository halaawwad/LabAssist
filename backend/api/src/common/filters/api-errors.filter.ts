import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
@Catch()
export class ApiErrors implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (error instanceof HttpException) {
      const detail = error.getResponse();
      return res.status(error.getStatus()).json({
        statusCode: error.getStatus(),
        ...(typeof detail === "string" ? { message: detail } : detail),
      });
    }
    const code = error?.meta?.code;
    if (code === "23505" || error?.code === "P2002")
      return res.status(409).json({
        statusCode: 409,
        message: "Account identity or active workshop manager already exists.",
      });
    if (code === "P0001" || code === "23514" || code === "23503")
      return res.status(400).json({
        statusCode: 400,
        message: "The account action is invalid, expired, or conflicts with an existing rule.",
      });
    res
      .status(500)
      .json({ statusCode: 500, message: "The request could not be completed. Please retry." });
  }
}
