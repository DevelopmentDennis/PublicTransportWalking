using System.Text.Json;
using Azure.Core.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Builder;
using PublicTransportWalking.Options;
using PublicTransportWalking.Services;

const string apiKeySettingName = "GoogleMapsApiKey";


var builder = FunctionsApplication.CreateBuilder(args);

builder.ConfigureFunctionsWebApplication();

var apiKey = builder.Configuration[apiKeySettingName];

if (string.IsNullOrWhiteSpace(apiKey))
{
    throw new InvalidOperationException($"Missing app setting '{apiKeySettingName}'.");
}

builder.Services.AddSingleton(new GoogleRoutesApiOptions
{
    ApiKey = apiKey
});

builder.Services.AddSingleton(new HttpClient
{
    BaseAddress = new Uri("https://routes.googleapis.com/")
});

builder.Services.AddSingleton<GoogleRoutesApiClient>();
builder.Services.AddSingleton<IDistanceTimeService, DistanceTimeService>();


var sharedJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);

builder.Services.AddSingleton(sharedJsonOptions);

// Optional: make Azure Functions isolated worker use the same JSON settings globally
builder.Services.Configure<WorkerOptions>(o =>
{
    o.Serializer = new JsonObjectSerializer(sharedJsonOptions);
});

builder.Build().Run();
