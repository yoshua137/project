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
        /// Estado de la aplicación: 'PENDIENTE', 'ENTREVISTA', 'APROBADA', 'RECHAZADA', 'REVISION'
        /// </summary>
        [Required]
        [RegularExpression("PENDIENTE|ENTREVISTA|APROBADA|RECHAZADA|REVISION", ErrorMessage = "Status solo puede ser 'PENDIENTE', 'ENTREVISTA', 'APROBADA', 'RECHAZADA' o 'REVISION'")]
        public string Status { get; set; } = "PENDIENTE";

        public string? CoverLetter { get; set; }
        public string? CVFilePath { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? ReviewNotes { get; set; }
        public string? VirtualMeetingLink { get; set; }
        
        // Detalles de la entrevista
        public DateTime? InterviewDateTime { get; set; }
        public string? InterviewMode { get; set; }
        public string? InterviewLink { get; set; }
        public string? InterviewAddress { get; set; }
        public string? InterviewNotes { get; set; }
        
        // Confirmación de asistencia a entrevista
        public bool? InterviewAttendanceConfirmed { get; set; }
        
        // Carta de aceptación
        public string? AcceptanceLetterFilePath { get; set; }
        public string? AcceptanceNotes { get; set; }
        public DateTime? AcceptanceDate { get; set; }
        
        // Confirmación del estudiante de realizar la pasantía
        public bool? StudentAcceptanceConfirmed { get; set; }
        public DateTime? StudentAcceptanceConfirmedDate { get; set; }
    }
} 