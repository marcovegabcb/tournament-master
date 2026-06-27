using System.Diagnostics;

namespace Torneos.API.Middleware;

public class GlobalExceptionHandler : IMiddleware
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (InvalidOperationException ex)
        {
            // Business rule violations thrown intentionally from Models/Services
            _logger.LogWarning(ex, "Business rule violation: {Message}", ex.Message);
            await WriteErrorAsync(context, StatusCodes.Status400BadRequest, ex.Message);
        }
        catch (Exception ex)
        {
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            _logger.LogError(ex, "Unhandled exception [TraceId: {TraceId}]", traceId);
            var msg = $"{ex.GetType().Name}: {ex.Message}";
            if (ex.InnerException != null)
                msg += $" | Inner: {ex.InnerException.GetType().Name}: {ex.InnerException.Message}";
            await WriteErrorAsync(context, StatusCodes.Status500InternalServerError,
                msg, traceId);
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, int statusCode, string message, string? traceId = null)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var body = traceId is null
            ? new { status = statusCode, error = message }
            : (object)new { status = statusCode, error = message, traceId };

        await context.Response.WriteAsJsonAsync(body);
    }
}
