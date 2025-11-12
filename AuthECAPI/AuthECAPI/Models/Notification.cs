using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class Notification
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public string UserId { get; set; }
        [ForeignKey("UserId")]
        public virtual AppUser User { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; }

        [Required]
        [StringLength(1000)]
        public string Message { get; set; }

        /// <summary>
        /// Tipo de notificación: 'APPLICATION_ACCEPTED', 'INTERVIEW_SCHEDULED', 'ATTENDANCE_CONFIRMED', 'AGREEMENT_APPROVED', 'AGREEMENT_REJECTED', etc.
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Type { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// ID de la entidad relacionada (ej: ApplicationId, AgreementRequestId)
        /// </summary>
        public int? RelatedEntityId { get; set; }

        /// <summary>
        /// Tipo de entidad relacionada: 'InternshipApplication', 'AgreementRequest', etc.
        /// </summary>
        [StringLength(50)]
        public string? RelatedEntityType { get; set; }
    }
}

