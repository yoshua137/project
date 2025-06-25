using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Models
{
    public class ReviewAgreementRequest
    {
        [Required(ErrorMessage = "El ID del convenio es requerido")]
        public int AgreementRequestId { get; set; }

        [Required(ErrorMessage = "La decisión es requerida")]
        public string Decision { get; set; } // "Accepted" o "Rejected"

        [StringLength(1000, ErrorMessage = "Los comentarios no pueden exceder 1000 caracteres")]
        public string? Comments { get; set; }
    }
} 