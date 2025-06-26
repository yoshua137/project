using System;

namespace AuthECAPI.Models
{
    public class InternshipOfferResponse
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string OrganizationId { get; set; }
        public string OrganizationName { get; set; }
        public string Mode { get; set; }
        public string Career { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
    }
} 