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
        /// Estado de la aplicación: 'PENDIENTE', 'ENTREVISTA', 'APROBADA', 'RECHAZADA', 'REVISION', 'Aceptado'
        /// </summary>
        [Required]
        [RegularExpression("PENDIENTE|ENTREVISTA|APROBADA|RECHAZADA|REVISION|Aceptado", ErrorMessage = "Status solo puede ser 'PENDIENTE', 'ENTREVISTA', 'APROBADA', 'RECHAZADA', 'REVISION' o 'Aceptado'")]
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
        
        // Estado de evaluación (APROBADA o RECHAZADA) - independiente del Status principal
        public string? EvaluationStatus { get; set; }
        
        // Aprobación del director
        /// <summary>
        /// Estado de aprobación del director: 'Aceptado', 'Rechazado', o null (pendiente)
        /// </summary>
        public string? DirectorApprovalStatus { get; set; }
        public DateTime? DirectorApprovalDate { get; set; }
        public string? DirectorApprovalNotes { get; set; }
    }
} 