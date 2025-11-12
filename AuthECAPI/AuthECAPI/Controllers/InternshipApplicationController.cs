using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using AuthECAPI.Services;
using AuthECAPI.Hubs;
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
        private readonly IHubContext<InternshipNotificationHub> _hubContext;
        private readonly ICloudTimeService _cloudTimeService;
        private readonly INotificationService _notificationService;

        public InternshipApplicationController(AppDbContext context, IHubContext<InternshipNotificationHub> hubContext, ICloudTimeService cloudTimeService, INotificationService notificationService)
        {
            _context = context;
            _hubContext = hubContext;
            _cloudTimeService = cloudTimeService;
            _notificationService = notificationService;
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

                    var fileName = $"{Guid.NewGuid()}_{_cloudTimeService.Now:yyyyMMddHHmmss}.pdf";
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
                    ApplicationDate = _cloudTimeService.Now,
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
                    VirtualMeetingLink = application.VirtualMeetingLink,
                    InterviewDateTime = application.InterviewDateTime,
                    InterviewMode = application.InterviewMode,
                    InterviewLink = application.InterviewLink,
                    InterviewAddress = application.InterviewAddress,
                    InterviewAttendanceConfirmed = application.InterviewAttendanceConfirmed
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
                        VirtualMeetingLink = ia.VirtualMeetingLink,
                        InterviewDateTime = ia.InterviewDateTime,
                        InterviewMode = ia.InterviewMode,
                        InterviewLink = ia.InterviewLink,
                        InterviewAddress = ia.InterviewAddress,
                        InterviewAttendanceConfirmed = ia.InterviewAttendanceConfirmed
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
                        VirtualMeetingLink = ia.VirtualMeetingLink,
                        InterviewDateTime = ia.InterviewDateTime,
                        InterviewMode = ia.InterviewMode,
                        InterviewLink = ia.InterviewLink,
                        InterviewAddress = ia.InterviewAddress,
                        InterviewAttendanceConfirmed = ia.InterviewAttendanceConfirmed
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
                application.ReviewDate = _cloudTimeService.Now;
                application.ReviewNotes = reviewRequest.ReviewNotes;
                application.VirtualMeetingLink = reviewRequest.VirtualMeetingLink;
                
                // Guardar detalles de la entrevista si el estado es ENTREVISTA
                if (reviewRequest.Status == "ENTREVISTA")
                {
                    application.InterviewDateTime = reviewRequest.InterviewDateTime;
                    application.InterviewMode = reviewRequest.InterviewMode;
                    application.InterviewLink = reviewRequest.InterviewLink;
                    application.InterviewAddress = reviewRequest.InterviewAddress;
                }
                else
                {
                    // Limpiar campos de entrevista si el estado cambia a otro que no sea ENTREVISTA
                    application.InterviewDateTime = null;
                    application.InterviewMode = null;
                    application.InterviewLink = null;
                    application.InterviewAddress = null;
                }

                await _context.SaveChangesAsync();

                // Crear notificación persistente y enviar notificación en tiempo real al estudiante
                if (reviewRequest.Status == "ENTREVISTA")
                {
                    var interviewDateStr = application.InterviewDateTime?.ToString("dd/MM/yyyy HH:mm") ?? "Fecha por confirmar";
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Entrevista Programada",
                        $"Se ha programado una entrevista para la oferta '{application.InternshipOffer.Title}' el {interviewDateStr}.",
                        "INTERVIEW_SCHEDULED",
                        application.Id,
                        "InternshipApplication"
                    );

                    await _hubContext.Clients.Group($"user_{application.StudentId}").SendAsync("InterviewScheduled", new
                    {
                        applicationId = application.Id,
                        offerTitle = application.InternshipOffer.Title,
                        interviewDateTime = application.InterviewDateTime,
                        interviewMode = application.InterviewMode,
                        interviewLink = application.InterviewLink,
                        interviewAddress = application.InterviewAddress
                    });
                }
                else if (reviewRequest.Status == "ACEPTADA")
                {
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Aplicación Aceptada",
                        $"Tu aplicación para la oferta '{application.InternshipOffer.Title}' ha sido aceptada. ¡Felicidades!",
                        "APPLICATION_ACCEPTED",
                        application.Id,
                        "InternshipApplication"
                    );

                    await _hubContext.Clients.Group($"user_{application.StudentId}").SendAsync("ApplicationStatusChanged", new
                    {
                        applicationId = application.Id,
                        offerTitle = application.InternshipOffer.Title,
                        status = "ACEPTADA"
                    });
                }
                else if (reviewRequest.Status == "RECHAZADA")
                {
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Aplicación Rechazada",
                        $"Tu aplicación para la oferta '{application.InternshipOffer.Title}' ha sido rechazada.",
                        "APPLICATION_REJECTED",
                        application.Id,
                        "InternshipApplication"
                    );

                    await _hubContext.Clients.Group($"user_{application.StudentId}").SendAsync("ApplicationStatusChanged", new
                    {
                        applicationId = application.Id,
                        offerTitle = application.InternshipOffer.Title,
                        status = "RECHAZADA"
                    });
                }

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

        // PUT: api/InternshipApplication/{id}/confirm-attendance
        [HttpPut("{id}/confirm-attendance")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ConfirmInterviewAttendance(int id, [FromBody] ConfirmAttendanceRequest request)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la aplicación pertenece al estudiante actual
                if (application.StudentId != userId)
                {
                    return Forbid("No tienes permisos para confirmar asistencia a esta entrevista");
                }

                // Verificar que la aplicación está en estado ENTREVISTA
                if (application.Status != "ENTREVISTA")
                {
                    return BadRequest("Solo se puede confirmar asistencia para aplicaciones en estado ENTREVISTA");
                }

                application.InterviewAttendanceConfirmed = request.WillAttend;

                await _context.SaveChangesAsync();

                // Enviar notificación en tiempo real a la organización y crear notificación persistente
                var offer = await _context.InternshipOffers
                    .Include(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .FirstOrDefaultAsync(io => io.Id == application.InternshipOfferId);

                if (offer != null)
                {
                    var student = await _context.Students
                        .Include(s => s.AppUser)
                        .FirstOrDefaultAsync(s => s.Id == application.StudentId);

                    var studentName = student?.AppUser?.FullName ?? "Un estudiante";
                    var attendanceStatus = request.WillAttend ? "aceptará" : "no aceptará";

                    await _notificationService.CreateNotificationAsync(
                        offer.OrganizationId,
                        request.WillAttend ? "Confirmación de Asistencia a Entrevista" : "Rechazo de Asistencia a Entrevista",
                        $"{studentName} {attendanceStatus} asistir a la entrevista para la oferta '{offer.Title}'.",
                        "ATTENDANCE_CONFIRMED",
                        application.Id,
                        "InternshipApplication"
                    );

                    await _hubContext.Clients.Group($"user_{offer.OrganizationId}").SendAsync("AttendanceConfirmed", new
                    {
                        applicationId = application.Id,
                        studentId = application.StudentId,
                        studentName = (await _context.Students
                            .Include(s => s.AppUser)
                            .FirstOrDefaultAsync(s => s.Id == application.StudentId))?.AppUser?.FullName ?? "Estudiante",
                        offerTitle = offer.Title,
                        willAttend = request.WillAttend
                    });
                }

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

        // Campos de entrevista
        public DateTime? InterviewDateTime { get; set; }
        public string? InterviewMode { get; set; }
        public string? InterviewLink { get; set; }
        public string? InterviewAddress { get; set; }
    }

    public class ConfirmAttendanceRequest
    {
        [Required]
        public bool WillAttend { get; set; }
    }
} 