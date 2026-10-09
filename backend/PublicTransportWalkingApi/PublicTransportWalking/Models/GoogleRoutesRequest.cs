namespace PublicTransportWalking.Models;

internal class GoogleRoutesRequest
{
    public GoogleWaypoint Origin { get; set; }

    public GoogleWaypoint Destination { get; set; }

    public string TravelMode { get; set; }

    public string Units { get; set; }
}

internal class GoogleWaypoint
{
    public GoogleLocation Location { get; set; }
}

internal class GoogleLocation
{
    public GoogleLatLng LatLng { get; set; }
}

internal class GoogleLatLng
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }
}
