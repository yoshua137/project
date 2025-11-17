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
        // Configurar camelCase para nombres de propiedades
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
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

// Registrar servicio de notificaciones
builder.Services.AddScoped<INotificationService, NotificationService>();

var app = builder.Build();

// Aplicar migraciones automáticamente al iniciar la aplicación
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();
        
        // Intentar aplicar migraciones si existen
        try
        {
            var pendingMigrations = context.Database.GetPendingMigrations().ToList();
            if (pendingMigrations.Any())
            {
                logger.LogInformation("Aplicando {Count} migraciones pendientes...", pendingMigrations.Count);
                context.Database.Migrate();
                logger.LogInformation("Migraciones aplicadas correctamente.");
            }
            else
            {
                logger.LogInformation("La base de datos está actualizada.");
            }
        }
        catch (InvalidOperationException)
        {
            // Si no hay migraciones, intentar crear la base de datos directamente
            logger.LogWarning("No se encontraron migraciones. Intentando crear la base de datos...");
            if (!context.Database.CanConnect())
            {
                context.Database.EnsureCreated();
                logger.LogInformation("Base de datos creada correctamente.");
            }
            else
            {
                logger.LogInformation("La base de datos ya existe.");
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Ocurrió un error al aplicar las migraciones de la base de datos: {Message}", ex.Message);
        // No relanzar la excepción para permitir que la aplicación inicie y muestre el error en los logs
    }
}

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



