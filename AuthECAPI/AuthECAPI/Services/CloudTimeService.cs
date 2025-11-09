using System.Net.Http.Json;

namespace AuthECAPI.Services
{
    /// <summary>
    /// Implementación del servicio de tiempo de la nube usando WorldTimeAPI para hora de Bolivia
    /// </summary>
    public class CloudTimeService : ICloudTimeService
    {
        private readonly HttpClient _httpClient;
        private DateTime _lastSyncedTime;
        private TimeSpan _systemTimeOffset;
        private bool _isSynced = false;
        private readonly object _lockObject = new object();
        private static TimeZoneInfo? _boliviaTimeZone;

        public CloudTimeService(HttpClient httpClient)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(10);
            _systemTimeOffset = TimeSpan.Zero;
            InitializeBoliviaTimeZone();
        }

        private static void InitializeBoliviaTimeZone()
        {
            if (_boliviaTimeZone == null)
            {
                try
                {
                    // Intentar obtener la zona horaria de Bolivia
                    // Windows: "SA Western Standard Time"
                    // Linux/Mac: "America/La_Paz"
                    _boliviaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SA Western Standard Time");
                }
                catch (TimeZoneNotFoundException)
                {
                    try
                    {
                        _boliviaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
                    }
                    catch
                    {
                        // Si no funciona, crear una zona horaria personalizada UTC-4
                        _boliviaTimeZone = TimeZoneInfo.CreateCustomTimeZone(
                            "Bolivia Time",
                            TimeSpan.FromHours(-4),
                            "Bolivia Time",
                            "Bolivia Time");
                    }
                }
            }
        }

        /// <summary>
        /// Obtiene la fecha y hora actual desde la nube (hora de Bolivia)
        /// </summary>
        public async Task<DateTime> GetCloudTimeAsync()
        {
            try
            {
                // Usar WorldTimeAPI para obtener la hora de Bolivia (America/La_Paz)
                var response = await _httpClient.GetFromJsonAsync<WorldTimeApiResponse>("https://worldtimeapi.org/api/timezone/America/La_Paz");
                
                if (response != null && !string.IsNullOrEmpty(response.DateTime))
                {
                    if (DateTime.TryParse(response.DateTime, out var cloudTime))
                    {
                        // La respuesta viene en formato ISO, convertir a hora de Bolivia
                        // WorldTimeAPI devuelve la hora local de la zona horaria especificada
                        return cloudTime;
                    }
                }

                // Si falla, usar la hora actual de Bolivia como fallback
                return GetBoliviaTimeNow();
            }
            catch
            {
                // Si falla la conexión, usar la hora actual de Bolivia como fallback
                return GetBoliviaTimeNow();
            }
        }

        /// <summary>
        /// Obtiene la hora actual de Bolivia
        /// </summary>
        private DateTime GetBoliviaTimeNow()
        {
            if (_boliviaTimeZone != null)
            {
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _boliviaTimeZone);
            }
            // Fallback: UTC-4
            return DateTime.UtcNow.AddHours(-4);
        }

        /// <summary>
        /// Obtiene la fecha y hora actual del sistema (sincronizada con la nube, hora de Bolivia)
        /// </summary>
        public DateTime Now
        {
            get
            {
                lock (_lockObject)
                {
                    if (_isSynced)
                    {
                        // Calcular el tiempo transcurrido desde la última sincronización
                        var currentBoliviaTime = GetBoliviaTimeNow();
                        var elapsed = currentBoliviaTime - _lastSyncedTime;
                        return currentBoliviaTime + _systemTimeOffset;
                    }
                    else
                    {
                        // Si no está sincronizado, usar la hora actual de Bolivia
                        return GetBoliviaTimeNow();
                    }
                }
            }
        }

        /// <summary>
        /// Obtiene la fecha actual (sin hora)
        /// </summary>
        public DateTime Today => Now.Date;

        /// <summary>
        /// Sincroniza la hora del sistema con la hora de la nube (Bolivia)
        /// </summary>
        public async Task SyncWithCloudAsync()
        {
            try
            {
                var cloudTime = await GetCloudTimeAsync();
                var systemTime = GetBoliviaTimeNow();

                lock (_lockObject)
                {
                    _systemTimeOffset = cloudTime - systemTime;
                    _lastSyncedTime = systemTime;
                    _isSynced = true;
                }
            }
            catch
            {
                // Si falla la sincronización, mantener el estado actual
                lock (_lockObject)
                {
                    _isSynced = false;
                }
            }
        }

        /// <summary>
        /// Modelo para la respuesta de WorldTimeAPI
        /// </summary>
        private class WorldTimeApiResponse
        {
            public string? DateTime { get; set; }
        }
    }
}

