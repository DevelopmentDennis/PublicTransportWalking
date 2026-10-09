using System;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using PublicTransportWalking.Models;

namespace PublicTransportWalking.Services;

public interface IDistanceTimeService
{
    Task<DistanceTimeResponse> GetWalkingDistanceTimeAsync(DistanceTimeRequest request, CancellationToken cancellationToken);
}

internal class DistanceTimeService(GoogleRoutesApiClient googleRoutesApiClient) : IDistanceTimeService
{
    public async Task<DistanceTimeResponse> GetWalkingDistanceTimeAsync(DistanceTimeRequest request, CancellationToken cancellationToken)
    {
        var googleRequest = new GoogleRoutesRequest
        {
            Origin = MapWaypoint(request.Origin),
            Destination = MapWaypoint(request.Destination),
            TravelMode = "WALK",
            Units = "METRIC"
        };

        var googleResponse = await googleRoutesApiClient.ComputeRoutesAsync(googleRequest, cancellationToken);
        var firstRoute = googleResponse?.Routes?.FirstOrDefault();
        if (firstRoute == null)
        {
            return null;
        }

        return new DistanceTimeResponse
        {
            DistanceMeters = firstRoute.DistanceMeters,
            DurationSeconds = ParseDurationSeconds(firstRoute.Duration)
        };
    }

    private static GoogleWaypoint MapWaypoint(Coordinate coordinate)
    {
        return new GoogleWaypoint
        {
            Location = new GoogleLocation
            {
                LatLng = new GoogleLatLng
                {
                    Latitude = coordinate.Latitude,
                    Longitude = coordinate.Longitude
                }
            }
        };
    }

    private static int ParseDurationSeconds(string durationValue)
    {
        if (string.IsNullOrWhiteSpace(durationValue) || !durationValue.EndsWith("s", StringComparison.OrdinalIgnoreCase))
        {
            return 0;
        }

        var secondsText = durationValue.Substring(0, durationValue.Length - 1);
        if (double.TryParse(secondsText, NumberStyles.Float, CultureInfo.InvariantCulture, out var seconds))
        {
            return (int)Math.Round(seconds, MidpointRounding.AwayFromZero);
        }

        return 0;
    }
}
