using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Models
{
    public class CreateInternshipApplicationRequest
    {
        [Required(ErrorMessage = "El ID de la oferta de pasantía es requerido")]
        public int InternshipOfferId { get; set; }

        [StringLength(2000, MinimumLength = 10, ErrorMessage = "La carta de presentación debe tener entre 10 y 2000 caracteres")]
        public string? CoverLetter { get; set; }

        public IFormFile? CV { get; set; }
    }
} 