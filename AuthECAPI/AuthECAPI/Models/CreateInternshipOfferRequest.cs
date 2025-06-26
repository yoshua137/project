using System;
using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Models
{
    public class CreateInternshipOfferRequest
    {
        [Required(ErrorMessage = "El título es requerido")]
        [StringLength(100, MinimumLength = 5, ErrorMessage = "El título debe tener entre 5 y 100 caracteres")]
        public string Title { get; set; }

        [Required(ErrorMessage = "La descripción es requerida")]
        [StringLength(1000, MinimumLength = 20, ErrorMessage = "La descripción debe tener entre 20 y 1000 caracteres")]
        public string Description { get; set; }

        [Required(ErrorMessage = "Los requisitos son requeridos")]
        [StringLength(500, MinimumLength = 10, ErrorMessage = "Los requisitos deben tener entre 10 y 500 caracteres")]
        public string Requirements { get; set; }

        [Required(ErrorMessage = "La fecha de inicio es requerida")]
        public DateTime StartDate { get; set; }

        [Required(ErrorMessage = "La fecha de fin es requerida")]
        public DateTime EndDate { get; set; }

        [Required(ErrorMessage = "La modalidad es requerida")]
        public string Mode { get; set; }

        [Required(ErrorMessage = "La carrera es requerida")]
        public string Career { get; set; }

        public string? ContactEmail { get; set; }
        public string? ContactPhone { get; set; }
    }
} 