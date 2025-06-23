using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace AuthECAPI.Models
{
    public class CreateAgreementRequestRequest
    {
        [Required(ErrorMessage = "El ID del director es requerido")]
        public string DirectorId { get; set; }

        [Required(ErrorMessage = "La descripción es requerida")]
        [StringLength(1000, MinimumLength = 20, ErrorMessage = "La descripción debe tener entre 20 y 1000 caracteres")]
        public string Description { get; set; }

        [Required(ErrorMessage = "La carta PDF es requerida")]
        public IFormFile PdfFile { get; set; }
    }
} 