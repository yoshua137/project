using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class InternshipOffer
    {
        [Key]
        public int Id { get; set; }

        public string OrganizationId { get; set; }
        [ForeignKey("OrganizationId")]
        public virtual Organization Organization { get; set; }

        public string Title { get; set; }
        public string Description { get; set; }
        public string Requirements { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Mode { get; set; }
        public string Career { get; set; }
        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
        /// <summary>
        /// Estado de vacantes: 'DISPONIBLES' o 'AGOTADAS'
        /// </summary>
        [Required]
        [RegularExpression("DISPONIBLES|AGOTADAS", ErrorMessage = "Vacancies solo puede ser 'DISPONIBLES' o 'AGOTADAS'")]
        public string Vacancies { get; set; }

        public virtual ICollection<InternshipApplication> InternshipApplications { get; set; }
    }
} 