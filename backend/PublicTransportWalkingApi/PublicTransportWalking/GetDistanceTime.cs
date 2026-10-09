using System.Net;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using PublicTransportWalking.Models;
using PublicTransportWalking.Services;

namespace PublicTransportWalking;

public class GetDistanceTime(
    IDistanceTimeService distanceTimeService,
    JsonSerializerOptions jsonSerializerOptions)
{
    [Function(nameof(GetDistanceTime))]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = null)] HttpRequestData req,
        FunctionContext executionContext,
        CancellationToken cancellationToken)
    {
        var logger = executionContext.GetLogger<GetDistanceTime>();
        var requestBody = await new StreamReader(req.Body).ReadToEndAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(requestBody))
        {
            var response = req.CreateResponse(HttpStatusCode.BadRequest);
            await response.WriteStringAsync("Request body is required.");
            return response;
        }

        DistanceTimeRequest? request;
        try
        {
            request = JsonSerializer.Deserialize<DistanceTimeRequest>(requestBody, jsonSerializerOptions);
        }
        catch (JsonException)
        {
            var response = req.CreateResponse(HttpStatusCode.BadRequest);
            await response.WriteStringAsync("Invalid JSON request body.");
            return response;
        }

        if (!HasValidCoordinates(request))
        {
            var response = req.CreateResponse(HttpStatusCode.BadRequest);
            await response.WriteStringAsync("origin and destination with valid latitude/longitude are required.");
            return response;
        }

        try
        {
            var result = await distanceTimeService.GetWalkingDistanceTimeAsync(request!, cancellationToken);
            if (result == null)
            {
                var response = req.CreateResponse(HttpStatusCode.NotFound);
                await response.WriteStringAsync("No walking route was found.");
                return response;
            }

            var okResponse = req.CreateResponse(HttpStatusCode.OK);
            await okResponse.WriteAsJsonAsync(result, cancellationToken);
            return okResponse;
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Google Routes API call failed.");
            var response = req.CreateResponse(HttpStatusCode.BadGateway);
            await response.WriteStringAsync("Failed to retrieve route from Google Maps.");
            return response;
        }
        catch (InvalidOperationException ex)
        {
            logger.LogError(ex, "Google Maps configuration is invalid.");
            var response = req.CreateResponse(HttpStatusCode.InternalServerError);
            await response.WriteStringAsync("Server configuration error.");
            return response;
        }
    }

    private static bool HasValidCoordinates(DistanceTimeRequest? request)
    {
        return request != null
               && IsValidCoordinate(request.Origin)
               && IsValidCoordinate(request.Destination);
    }

    private static bool IsValidCoordinate(Coordinate? coordinate)
    {
        return coordinate != null
               && coordinate.Latitude >= -90 && coordinate.Latitude <= 90
               && coordinate.Longitude >= -180 && coordinate.Longitude <= 180;
    }
}
