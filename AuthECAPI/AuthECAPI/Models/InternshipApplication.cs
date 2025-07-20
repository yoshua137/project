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
        [ForeignKey("InternshipOfferId")]
        public virtual InternshipOffer InternshipOffer { get; set; }

        public string StudentId { get; set; }
        [ForeignKey("StudentId")]
        public virtual Student Student { get; set; }

        public DateTime ApplicationDate { get; set; }
        
        /// <summary>
        /// Estado de la aplicación: 'PENDIENTE', 'ACEPTADA', 'RECHAZADA'
        /// </summary>
        [Required]
        [RegularExpression("PENDIENTE|ACEPTADA|RECHAZADA", ErrorMessage = "Status solo puede ser 'PENDIENTE', 'ACEPTADA' o 'RECHAZADA'")]
        public string Status { get; set; } = "PENDIENTE";

        public string? CoverLetter { get; set; }
        public string? CVFilePath { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? ReviewNotes { get; set; }
    }
} 