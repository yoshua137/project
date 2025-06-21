using System.Collections.Generic;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class Organization
    {
        [ForeignKey("AppUser")]
        public string Id { get; set; }
        public string Area { get; set; }
        public virtual AppUser AppUser { get; set; }
        public virtual ICollection<AgreementRequest> AgreementRequests { get; set; }
        public virtual ICollection<InternshipOffer> InternshipOffers { get; set; }
    }
} 