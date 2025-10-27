using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class InternshipApplication
    {
        [Key]
        public int Id { get; set; }

        public int InternshipOfferId { get; set; }
        public virtual InternshipOffer InternshipOffer { get; set; }

        public string StudentId { get; set; }
        public virtual Student Student { get; set; }

        public DateTime ApplicationDate { get; set; }
        
        /// <summary>
        /// Estado de la aplicación: 'PENDIENTE', 'ENTREVISTA', 'ACEPTADA', 'RECHAZADA'
        /// </summary>
        [Required]
        [RegularExpression("PENDIENTE|ENTREVISTA|ACEPTADA|RECHAZADA", ErrorMessage = "Status solo puede ser 'PENDIENTE', 'ENTREVISTA', 'ACEPTADA' o 'RECHAZADA'")]
        public string Status { get; set; } = "PENDIENTE";

        public string? CoverLetter { get; set; }
        public string? CVFilePath { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? ReviewNotes { get; set; }
        public string? VirtualMeetingLink { get; set; }
    }
} 