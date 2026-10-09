using System.Collections.Generic;

namespace PublicTransportWalking.Models;

internal class GoogleRoutesResponse
{
    public List<GoogleRoute> Routes { get; set; }
}

internal class GoogleRoute
{
    public int DistanceMeters { get; set; }

    public string Duration { get; set; }
}
