using System;

namespace AuthECAPI.Models
{
    public class AgreementRequestResponse
    {
        public int Id { get; set; }
        public string OrganizationId { get; set; }
        public string OrganizationName { get; set; }
        public string DirectorId { get; set; }
        public string DirectorName { get; set; }
        public DateTime RequestDate { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }
        public string PdfFilePath { get; set; }
    }
} 