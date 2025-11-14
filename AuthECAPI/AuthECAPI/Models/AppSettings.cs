namespace AuthECAPI.Models
{
    public class AppSettings
    {
        public string JWTSecret { get; set; }
        public string GoogleClientId { get; set; }
        public string? FrontendBaseUrl { get; set; }
    }
}
