using System;

namespace AuthECAPI.Helpers
{
    /// <summary>
    /// Helper para manejar fechas y horas con la zona horaria de Bolivia
    /// </summary>
    public static class DateTimeHelper
    {
        private static TimeZoneInfo? _boliviaTimeZone;

        /// <summary>
        /// Obtiene la zona horaria de Bolivia
        /// </summary>
        public static TimeZoneInfo BoliviaTimeZone
        {
            get
            {
                if (_boliviaTimeZone == null)
                {
                    try
                    {
                        // Intentar obtener la zona horaria de Bolivia
                        // Windows: "SA Western Standard Time"
                        // Linux/Mac: "America/La_Paz" (requiere TimeZoneConverter package)
                        _boliviaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("SA Western Standard Time");
                    }
                    catch (TimeZoneNotFoundException)
                    {
                        // Si no se encuentra, intentar con el ID alternativo
                        try
                        {
                            _boliviaTimeZone = TimeZoneInfo.FindSystemTimeZoneById("America/La_Paz");
                        }
                        catch
                        {
                            // Si tampoco funciona, usar UTC-4 (offset de Bolivia)
                            _boliviaTimeZone = TimeZoneInfo.CreateCustomTimeZone(
                                "Bolivia Time",
                                TimeSpan.FromHours(-4),
                                "Bolivia Time",
                                "Bolivia Time");
                        }
                    }
                }
                return _boliviaTimeZone;
            }
        }

        /// <summary>
        /// Obtiene la fecha y hora actual en la zona horaria de Bolivia
        /// </summary>
        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, BoliviaTimeZone);

        /// <summary>
        /// Obtiene la fecha actual (sin hora) en la zona horaria de Bolivia
        /// </summary>
        public static DateTime Today => Now.Date;

        /// <summary>
        /// Convierte una fecha UTC a la zona horaria de Bolivia
        /// </summary>
        public static DateTime ToBoliviaTime(DateTime utcDateTime)
        {
            if (utcDateTime.Kind == DateTimeKind.Unspecified)
            {
                // Si no tiene especificado el tipo, asumir que es UTC
                return TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc), BoliviaTimeZone);
            }
            else if (utcDateTime.Kind == DateTimeKind.Utc)
            {
                return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime, BoliviaTimeZone);
            }
            else
            {
                // Si es Local, convertir primero a UTC y luego a Bolivia
                return TimeZoneInfo.ConvertTimeFromUtc(utcDateTime.ToUniversalTime(), BoliviaTimeZone);
            }
        }

        /// <summary>
        /// Convierte una fecha de la zona horaria de Bolivia a UTC
        /// </summary>
        public static DateTime ToUtc(DateTime boliviaDateTime)
        {
            if (boliviaDateTime.Kind == DateTimeKind.Utc)
            {
                return boliviaDateTime;
            }
            return TimeZoneInfo.ConvertTimeToUtc(boliviaDateTime, BoliviaTimeZone);
        }
    }
}

