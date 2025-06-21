using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class AgreementRequest
    {
        [Key]
        public int Id { get; set; }

        public string OrganizationId { get; set; }
        [ForeignKey("OrganizationId")]
        public virtual Organization Organization { get; set; }

        public string DirectorId { get; set; }
        [ForeignKey("DirectorId")]
        public virtual Director Director { get; set; }

        public DateTime RequestDate { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string Status { get; set; }
        public string Description { get; set; }
    }
} 