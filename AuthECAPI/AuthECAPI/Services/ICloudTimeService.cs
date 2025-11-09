namespace AuthECAPI.Services
{
    /// <summary>
    /// Servicio para obtener y manejar la hora de la nube
    /// </summary>
    public interface ICloudTimeService
    {
        /// <summary>
        /// Obtiene la fecha y hora actual desde la nube (UTC)
        /// </summary>
        Task<DateTime> GetCloudTimeAsync();

        /// <summary>
        /// Obtiene la fecha y hora actual del sistema (puede ser sincronizada con la nube)
        /// </summary>
        DateTime Now { get; }

        /// <summary>
        /// Obtiene la fecha actual (sin hora)
        /// </summary>
        DateTime Today { get; }

        /// <summary>
        /// Sincroniza la hora del sistema con la hora de la nube
        /// </summary>
        Task SyncWithCloudAsync();
    }
}

