using AuthECAPI.Controllers;
using AuthECAPI.Extensions;
using AuthECAPI.Models;
using AuthECAPI.Services;
using AuthECAPI.Hubs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);

// Configurar cultura para español de Bolivia
var cultureInfo = new CultureInfo("es-BO");
CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        // Configurar formato de fecha ISO 8601
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddSwaggerExplorer()
                .InjectDbContext(builder.Configuration)
                .AddAppConfig(builder.Configuration)
                .AddIdentityHandlersAndStores()
                .ConfigureIdentityOptions()
                .AddIdentityAuth(builder.Configuration);

// Agregar SignalR
builder.Services.AddSignalR();

// Registrar servicio de tiempo de la nube
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ICloudTimeService>(sp =>
{
    var httpClientFactory = sp.GetRequiredService<IHttpClientFactory>();
    var httpClient = httpClientFactory.CreateClient();
    return new CloudTimeService(httpClient);
});

var app = builder.Build();

// Sincronizar hora con la nube al iniciar la aplicación
var cloudTimeService = app.Services.GetRequiredService<ICloudTimeService>();
_ = Task.Run(async () => await cloudTimeService.SyncWithCloudAsync());

app.ConfigureSwaggerExplorer()
   .ConfigureCORS(builder.Configuration)
   .AddIdentityAuthMiddlewares();

app.MapControllers();
app.MapGroup("/api")
   .MapIdentityApi<AppUser>();
app.MapGroup("/api")
   .MapIdentityUserEndpoints()
   .MapAccountEndpoints()
   .MapAuthorizationDemoEndpoints()
   .MapRoleEndpoints();

// Mapear SignalR Hub
app.MapHub<InternshipNotificationHub>("/hubs/internship");

app.Run();



