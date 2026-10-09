using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using PublicTransportWalking.Models;
using PublicTransportWalking.Options;

namespace PublicTransportWalking.Services;

internal class GoogleRoutesApiClient(
    HttpClient httpClient,
    GoogleRoutesApiOptions options,
    JsonSerializerOptions jsonSerializerOptions)
{
    private const string FieldMask = "routes.duration,routes.distanceMeters";

    public async Task<GoogleRoutesResponse?> ComputeRoutesAsync(GoogleRoutesRequest request, CancellationToken cancellationToken)
    {
        var requestMessage = new HttpRequestMessage(HttpMethod.Post, "directions/v2:computeRoutes");
        requestMessage.Headers.Add("X-Goog-Api-Key", options.ApiKey);
        requestMessage.Headers.Add("X-Goog-FieldMask", FieldMask);
        requestMessage.Content = new StringContent(JsonSerializer.Serialize(request, jsonSerializerOptions), Encoding.UTF8, "application/json");

        var response = await httpClient.SendAsync(requestMessage, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);



        if (!response.IsSuccessStatusCode)
        {
            throw new HttpRequestException($"Google Routes API request failed with status {(int)response.StatusCode}: {responseBody}");
        }

        return JsonSerializer.Deserialize<GoogleRoutesResponse>(responseBody, jsonSerializerOptions);
    }
}
