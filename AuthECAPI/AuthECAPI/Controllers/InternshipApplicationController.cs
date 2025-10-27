using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InternshipApplicationController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InternshipApplicationController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/InternshipApplication
        [HttpPost]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<InternshipApplicationResponse>> CreateApplication([FromForm] CreateInternshipApplicationRequest applicationRequest)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                // Verificar que el estudiante existe
                var student = await _context.Students
                    .Include(s => s.AppUser)
                    .FirstOrDefaultAsync(s => s.Id == userId);

                if (student == null)
                {
                    return BadRequest("No se encontró el estudiante para el usuario actual");
                }

                // Verificar que la oferta de pasantía existe y está disponible
                var internshipOffer = await _context.InternshipOffers
                    .Include(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .FirstOrDefaultAsync(io => io.Id == applicationRequest.InternshipOfferId);

                if (internshipOffer == null)
                {
                    return BadRequest("No se encontró la oferta de pasantía");
                }

                if (internshipOffer.Vacancies != "DISPONIBLES")
                {
                    return BadRequest("Esta oferta de pasantía no está disponible para aplicaciones");
                }

                // Verificar que el estudiante no haya aplicado ya a esta oferta
                var existingApplication = await _context.InternshipApplications
                    .FirstOrDefaultAsync(ia => ia.InternshipOfferId == applicationRequest.InternshipOfferId && 
                                              ia.StudentId == userId);

                if (existingApplication != null)
                {
                    return BadRequest("Ya has aplicado a esta oferta de pasantía");
                }

                // Manejar la subida del CV
                string? cvFilePath = null;
                if (applicationRequest.CV != null)
                {
                    if (applicationRequest.CV.Length > 10 * 1024 * 1024) // 10MB máximo
                    {
                        return BadRequest("El archivo CV no puede exceder 10MB");
                    }

                    if (!applicationRequest.CV.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest("Solo se permiten archivos PDF para el CV");
                    }

                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "CVs");
                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }

                    var fileName = $"{Guid.NewGuid()}_{DateTime.Now:yyyyMMddHHmmss}.pdf";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await applicationRequest.CV.CopyToAsync(stream);
                    }

                    cvFilePath = fileName;
                }

                var application = new InternshipApplication
                {
                    InternshipOfferId = applicationRequest.InternshipOfferId,
                    StudentId = userId,
                    ApplicationDate = DateTime.UtcNow,
                    Status = "PENDIENTE",
                    CoverLetter = applicationRequest.CoverLetter,
                    CVFilePath = cvFilePath
                };

                _context.InternshipApplications.Add(application);
                await _context.SaveChangesAsync();

                var applicationResponse = new InternshipApplicationResponse
                {
                    Id = application.Id,
                    InternshipOfferId = application.InternshipOfferId,
                    InternshipOfferTitle = internshipOffer.Title,
                    OrganizationName = internshipOffer.Organization.AppUser?.FullName,
                    StudentId = application.StudentId,
                    StudentName = student.AppUser?.FullName,
                    StudentCareer = student.AppUser?.Career,
                    ApplicationDate = application.ApplicationDate,
                    Status = application.Status,
                    CoverLetter = application.CoverLetter,
                    CVFilePath = application.CVFilePath,
                    ReviewDate = application.ReviewDate,
                    ReviewNotes = application.ReviewNotes,
                    VirtualMeetingLink = application.VirtualMeetingLink
                };

                return CreatedAtAction(nameof(CreateApplication), new { id = applicationResponse.Id }, applicationResponse);
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/InternshipApplication/my-applications
        [HttpGet("my-applications")]
        [Authorize(Roles = "Student")]
        public async Task<ActionResult<IEnumerable<InternshipApplicationResponse>>> GetMyApplications()
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var applications = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ia => ia.Student)
                    .ThenInclude(s => s.AppUser)
                    .Where(ia => ia.StudentId == userId)
                    .OrderByDescending(ia => ia.ApplicationDate)
                    .Select(ia => new InternshipApplicationResponse
                    {
                        Id = ia.Id,
                        InternshipOfferId = ia.InternshipOfferId,
                        InternshipOfferTitle = ia.InternshipOffer.Title,
                        OrganizationName = ia.InternshipOffer.Organization.AppUser.FullName,
                        StudentId = ia.StudentId,
                        StudentName = ia.Student.AppUser.FullName,
                        StudentCareer = ia.Student.AppUser.Career,
                        ApplicationDate = ia.ApplicationDate,
                        Status = ia.Status,
                        CoverLetter = ia.CoverLetter,
                        CVFilePath = ia.CVFilePath,
                        ReviewDate = ia.ReviewDate,
                        ReviewNotes = ia.ReviewNotes,
                        VirtualMeetingLink = ia.VirtualMeetingLink
                    })
                    .ToListAsync();

                return Ok(applications);
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/InternshipApplication/offer/{offerId}
        [HttpGet("offer/{offerId}")]
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<IEnumerable<InternshipApplicationResponse>>> GetApplicationsForOffer(int offerId)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                // Verificar que la oferta pertenece a la organización del usuario
                var internshipOffer = await _context.InternshipOffers
                    .FirstOrDefaultAsync(io => io.Id == offerId && io.OrganizationId == userId);

                if (internshipOffer == null)
                {
                    return NotFound("No se encontró la oferta de pasantía o no tienes permisos para ver sus aplicaciones");
                }

                var applications = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ia => ia.Student)
                    .ThenInclude(s => s.AppUser)
                    .Where(ia => ia.InternshipOfferId == offerId)
                    .OrderByDescending(ia => ia.ApplicationDate)
                    .Select(ia => new InternshipApplicationResponse
                    {
                        Id = ia.Id,
                        InternshipOfferId = ia.InternshipOfferId,
                        InternshipOfferTitle = ia.InternshipOffer.Title,
                        OrganizationName = ia.InternshipOffer.Organization.AppUser.FullName,
                        StudentId = ia.StudentId,
                        StudentName = ia.Student.AppUser.FullName,
                        StudentCareer = ia.Student.AppUser.Career,
                        ApplicationDate = ia.ApplicationDate,
                        Status = ia.Status,
                        CoverLetter = ia.CoverLetter,
                        CVFilePath = ia.CVFilePath,
                        ReviewDate = ia.ReviewDate,
                        ReviewNotes = ia.ReviewNotes,
                        VirtualMeetingLink = ia.VirtualMeetingLink
                    })
                    .ToListAsync();

                return Ok(applications);
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/InternshipApplication/{id}/review
        [HttpPut("{id}/review")]
        [Authorize(Roles = "Organization")]
        public async Task<IActionResult> ReviewApplication(int id, [FromBody] ReviewApplicationRequest reviewRequest)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la oferta pertenece a la organización del usuario
                if (application.InternshipOffer.OrganizationId != userId)
                {
                    return Forbid("No tienes permisos para revisar esta aplicación");
                }

                application.Status = reviewRequest.Status;
                application.ReviewDate = DateTime.UtcNow;
                application.ReviewNotes = reviewRequest.ReviewNotes;
                application.VirtualMeetingLink = reviewRequest.VirtualMeetingLink;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/InternshipApplication/{id}/cv
        [HttpGet("{id}/cv")]
        [Authorize(Roles = "Organization")]
        public async Task<IActionResult> DownloadCV(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la oferta pertenece a la organización del usuario
                if (application.InternshipOffer.OrganizationId != userId)
                {
                    return Forbid("No tienes permisos para descargar este CV");
                }

                if (string.IsNullOrEmpty(application.CVFilePath))
                {
                    return NotFound("No se encontró el archivo CV");
                }

                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "CVs", application.CVFilePath);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("El archivo CV no existe en el servidor");
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                return File(fileBytes, "application/pdf", $"CV_{application.StudentId}_{application.InternshipOfferId}.pdf");
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/InternshipApplication/{id}/cv/student
        [HttpGet("{id}/cv/student")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> DownloadMyCV(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la aplicación pertenece al estudiante actual
                if (application.StudentId != userId)
                {
                    return Forbid("No tienes permisos para descargar este CV");
                }

                if (string.IsNullOrEmpty(application.CVFilePath))
                {
                    return NotFound("No se encontró el archivo CV");
                }

                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "CVs", application.CVFilePath);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("El archivo CV no existe en el servidor");
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                return File(fileBytes, "application/pdf", $"CV_{application.StudentId}_{application.InternshipOfferId}.pdf");
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }

    public class ReviewApplicationRequest
    {
        [Required]
        [RegularExpression("ENTREVISTA|ACEPTADA|RECHAZADA", ErrorMessage = "Status solo puede ser 'ENTREVISTA', 'ACEPTADA' o 'RECHAZADA'")]
        public string Status { get; set; }

        [StringLength(1000, ErrorMessage = "Las notas de revisión no pueden exceder 1000 caracteres")]
        public string? ReviewNotes { get; set; }

        [StringLength(500, ErrorMessage = "El enlace de reunión virtual no puede exceder 500 caracteres")]
        public string? VirtualMeetingLink { get; set; }
    }
} 