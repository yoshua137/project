using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class Director
    {
        [ForeignKey("AppUser")]
        public string Id { get; set; }
        public string? Department { get; set; }
        public virtual AppUser AppUser { get; set; }
        public virtual ICollection<AgreementRequest> AgreementRequests { get; set; }
    }
} 