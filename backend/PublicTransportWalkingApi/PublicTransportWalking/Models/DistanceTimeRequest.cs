namespace PublicTransportWalking.Models;

public class DistanceTimeRequest
{
    public Coordinate Origin { get; set; }

    public Coordinate Destination { get; set; }
}

public class Coordinate
{
    public double Latitude { get; set; }

    public double Longitude { get; set; }
}
