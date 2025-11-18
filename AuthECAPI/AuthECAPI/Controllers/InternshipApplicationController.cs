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

                // Crear notificación persistente y enviar notificación en tiempo real a la organización
                var organizationId = internshipOffer.OrganizationId;
                var studentName = student.AppUser?.FullName ?? "Un estudiante";
                var studentCareer = student.AppUser?.Career ?? "Estudiante";

                await _notificationService.CreateNotificationAsync(
                    organizationId,
                    "Nueva Postulación a Oferta de Pasantía",
                    $"{studentName} ({studentCareer}) se ha postulado a tu oferta '{internshipOffer.Title}'.",
                    "APPLICATION_RECEIVED",
                    application.Id,
                    "InternshipApplication"
                );

                // Enviar notificación en tiempo real a la organización
                await _hubContext.Clients.Group($"user_{organizationId}").SendAsync("ApplicationReceived", new
                {
                    applicationId = application.Id,
                    offerId = internshipOffer.Id,
                    offerTitle = internshipOffer.Title,
                    studentId = application.StudentId,
                    studentName = studentName,
                    studentCareer = studentCareer,
                    applicationDate = application.ApplicationDate
                });

                // Notificar a los profesores del estudiante sobre la nueva postulación
                var studentCourses = await _context.StudentCourses
                    .Where(sc => sc.StudentId == application.StudentId)
                    .Select(sc => sc.CourseId)
                    .ToListAsync();

                var courseTeachers = await _context.TeacherCourses
                    .Where(tc => studentCourses.Contains(tc.Id))
                    .Select(tc => tc.TeacherId)
                    .Distinct()
                    .ToListAsync();

                foreach (var teacherId in courseTeachers)
                {
                    await _hubContext.Clients.Group($"user_{teacherId}").SendAsync("StudentApplicationUpdated", new
                    {
                        studentId = application.StudentId,
                        applicationId = application.Id,
                        offerTitle = internshipOffer.Title,
                        status = "PENDIENTE",
                        applicationDate = application.ApplicationDate
                    });
                }

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
                    InterviewNotes = application.InterviewNotes,
                    InterviewAttendanceConfirmed = application.InterviewAttendanceConfirmed,
                    AcceptanceLetterFilePath = application.AcceptanceLetterFilePath,
                    AcceptanceNotes = application.AcceptanceNotes,
                    AcceptanceDate = application.AcceptanceDate,
                    StudentAcceptanceConfirmed = application.StudentAcceptanceConfirmed,
                    StudentAcceptanceConfirmedDate = application.StudentAcceptanceConfirmedDate,
                    EvaluationStatus = application.EvaluationStatus,
                    DirectorApprovalStatus = application.DirectorApprovalStatus,
                    DirectorApprovalDate = application.DirectorApprovalDate,
                    DirectorApprovalNotes = application.DirectorApprovalNotes
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
                        InterviewNotes = ia.InterviewNotes,
                        InterviewAttendanceConfirmed = ia.InterviewAttendanceConfirmed,
                        AcceptanceLetterFilePath = ia.AcceptanceLetterFilePath,
                        AcceptanceNotes = ia.AcceptanceNotes,
                        AcceptanceDate = ia.AcceptanceDate,
                        StudentAcceptanceConfirmed = ia.StudentAcceptanceConfirmed,
                        StudentAcceptanceConfirmedDate = ia.StudentAcceptanceConfirmedDate,
                        EvaluationStatus = ia.EvaluationStatus,
                        DirectorApprovalStatus = ia.DirectorApprovalStatus,
                        DirectorApprovalDate = ia.DirectorApprovalDate,
                        DirectorApprovalNotes = ia.DirectorApprovalNotes
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
                        InterviewNotes = ia.InterviewNotes,
                        InterviewAttendanceConfirmed = ia.InterviewAttendanceConfirmed,
                        AcceptanceLetterFilePath = ia.AcceptanceLetterFilePath,
                        AcceptanceNotes = ia.AcceptanceNotes,
                        AcceptanceDate = ia.AcceptanceDate,
                        StudentAcceptanceConfirmed = ia.StudentAcceptanceConfirmed,
                        StudentAcceptanceConfirmedDate = ia.StudentAcceptanceConfirmedDate,
                        EvaluationStatus = ia.EvaluationStatus,
                        DirectorApprovalStatus = ia.DirectorApprovalStatus,
                        DirectorApprovalDate = ia.DirectorApprovalDate,
                        DirectorApprovalNotes = ia.DirectorApprovalNotes
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
                
                // Guardar detalles de la entrevista si el estado es ENTREVISTA
                if (reviewRequest.Status == "ENTREVISTA")
                {
                    application.InterviewDateTime = reviewRequest.InterviewDateTime;
                    application.InterviewMode = reviewRequest.InterviewMode;
                    application.InterviewLink = reviewRequest.InterviewLink;
                    application.InterviewAddress = reviewRequest.InterviewAddress;
                    application.InterviewNotes = reviewRequest.InterviewNotes;
                    // No asignar ReviewNotes cuando se programa entrevista
                }
                else if (reviewRequest.Status == "APROBADA" || reviewRequest.Status == "RECHAZADA")
                {
                    // ReviewNotes solo se usa para evaluación (aprobación/rechazo)
                    application.ReviewNotes = reviewRequest.ReviewNotes;
                    // Guardar el estado de evaluación independientemente del Status principal
                    application.EvaluationStatus = reviewRequest.Status;
                }
                
                if (reviewRequest.VirtualMeetingLink != null)
                {
                    application.VirtualMeetingLink = string.IsNullOrWhiteSpace(reviewRequest.VirtualMeetingLink)
                        ? null
                        : reviewRequest.VirtualMeetingLink;
                }
                // No limpiar información de entrevista cuando se acepta/rechaza para mantener el historial

                await _context.SaveChangesAsync();

                // Obtener los cursos del estudiante para notificar a los profesores
                var studentCourses = await _context.StudentCourses
                    .Where(sc => sc.StudentId == application.StudentId)
                    .Select(sc => sc.CourseId)
                    .ToListAsync();

                var courseTeachers = await _context.TeacherCourses
                    .Where(tc => studentCourses.Contains(tc.Id))
                    .Select(tc => tc.TeacherId)
                    .Distinct()
                    .ToListAsync();

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

                    // Notificar a los profesores del estudiante sobre el cambio en la postulación
                    foreach (var teacherId in courseTeachers)
                    {
                        await _hubContext.Clients.Group($"user_{teacherId}").SendAsync("StudentApplicationUpdated", new
                        {
                            studentId = application.StudentId,
                            applicationId = application.Id,
                            offerTitle = application.InternshipOffer.Title,
                            status = reviewRequest.Status,
                            interviewDateTime = application.InterviewDateTime,
                            interviewMode = application.InterviewMode
                        });
                    }
                }
                else if (reviewRequest.Status == "APROBADA")
                {
                    await _notificationService.CreateNotificationAsync(
                        application.StudentId,
                        "Evaluación Aprobada",
                        $"Tu evaluación para la oferta '{application.InternshipOffer.Title}' ha sido aprobada. ¡Felicidades!",
                        "APPLICATION_ACCEPTED",
                        application.Id,
                        "InternshipApplication"
                    );

                    await _hubContext.Clients.Group($"user_{application.StudentId}").SendAsync("ApplicationStatusChanged", new
                    {
                        applicationId = application.Id,
                        offerTitle = application.InternshipOffer.Title,
                        status = "APROBADA"
                    });

                    // Notificar a los profesores del estudiante sobre el cambio en la postulación
                    foreach (var teacherId in courseTeachers)
                    {
                        await _hubContext.Clients.Group($"user_{teacherId}").SendAsync("StudentApplicationUpdated", new
                        {
                            studentId = application.StudentId,
                            applicationId = application.Id,
                            offerTitle = application.InternshipOffer.Title,
                            status = "APROBADA"
                        });
                    }
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

                    // Notificar a los profesores del estudiante sobre el cambio en la postulación
                    foreach (var teacherId in courseTeachers)
                    {
                        await _hubContext.Clients.Group($"user_{teacherId}").SendAsync("StudentApplicationUpdated", new
                        {
                            studentId = application.StudentId,
                            applicationId = application.Id,
                            offerTitle = application.InternshipOffer.Title,
                            status = "RECHAZADA"
                        });
                    }
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
        [Authorize(Roles = "Organization,Director")]
        public async Task<IActionResult> DownloadCV(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;
                var userRole = User.Claims.FirstOrDefault(c => c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar permisos según el rol
                if (userRole == "Organization")
                {
                    // Verificar que la oferta pertenece a la organización del usuario
                    if (application.InternshipOffer.OrganizationId != userId)
                    {
                        return Forbid("No tienes permisos para descargar este CV");
                    }
                }
                else if (userRole == "Director")
                {
                    // Verificar que el director está asignado a la organización
                    var isDirectorAssigned = await _context.AgreementRequests
                        .AnyAsync(ar => ar.DirectorId == userId 
                            && ar.OrganizationId == application.InternshipOffer.OrganizationId 
                            && ar.Status == "Accepted");
                    
                    if (!isDirectorAssigned)
                    {
                        return Forbid("No tienes permisos para descargar este CV");
                    }
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
                        studentName = student?.AppUser?.FullName ?? "Estudiante",
                        offerTitle = offer.Title,
                        willAttend = request.WillAttend
                    });
                }

                return Ok(new { message = "Asistencia confirmada correctamente" });
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

        // PUT: api/InternshipApplication/{id}/consolidate-acceptance
        [HttpPut("{id}/consolidate-acceptance")]
        [Authorize(Roles = "Organization")]
        public async Task<IActionResult> ConsolidateAcceptance(int id, [FromForm] ConsolidateAcceptanceRequest request)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la aplicación pertenece a una oferta de la organización actual
                if (application.InternshipOffer.OrganizationId != userId)
                {
                    return Forbid("No tienes permisos para consolidar la aceptación de esta aplicación");
                }

                // Verificar que la aplicación está en estado APROBADA
                if (application.Status != "APROBADA")
                {
                    return BadRequest("Solo se puede consolidar la aceptación para aplicaciones en estado APROBADA");
                }

                // Validar y guardar el archivo PDF
                string? acceptanceLetterFilePath = null;
                if (request.AcceptanceLetter != null)
                {
                    if (request.AcceptanceLetter.Length > 10 * 1024 * 1024) // 10MB máximo
                    {
                        return BadRequest("El archivo de carta de aceptación no puede exceder 10MB");
                    }

                    if (!request.AcceptanceLetter.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest("Solo se permiten archivos PDF para la carta de aceptación");
                    }

                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "AcceptanceLetters");
                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }

                    var fileName = $"{Guid.NewGuid()}_{_cloudTimeService.Now:yyyyMMddHHmmss}.pdf";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await request.AcceptanceLetter.CopyToAsync(stream);
                    }

                    acceptanceLetterFilePath = fileName;
                }

                // Actualizar la aplicación
                application.AcceptanceLetterFilePath = acceptanceLetterFilePath;
                application.AcceptanceNotes = request.AcceptanceNotes;
                application.AcceptanceDate = _cloudTimeService.Now;
                // Cambiar el estado a REVISION cuando se consolida la aceptación
                application.Status = "REVISION";

                await _context.SaveChangesAsync();

                return Ok(new 
                { 
                    message = "Aceptación consolidada correctamente",
                    acceptanceLetterFilePath = acceptanceLetterFilePath,
                    acceptanceNotes = application.AcceptanceNotes,
                    acceptanceDate = application.AcceptanceDate,
                    status = application.Status
                });
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

        // GET: api/InternshipApplication/{id}/acceptance-letter
        [HttpGet("{id}/acceptance-letter")]
        [Authorize(Roles = "Organization,Student,Director")]
        public async Task<IActionResult> DownloadAcceptanceLetter(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;
                var userRole = User.Claims.FirstOrDefault(c => c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")?.Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar permisos según el rol
                if (userRole == "Student")
                {
                    if (application.StudentId != userId)
                    {
                        return Forbid("No tienes permisos para descargar esta carta de aceptación");
                    }
                }
                else if (userRole == "Organization")
                {
                    if (application.InternshipOffer.OrganizationId != userId)
                    {
                        return Forbid("No tienes permisos para descargar esta carta de aceptación");
                    }
                }
                else if (userRole == "Director")
                {
                    // Verificar que el director está asignado a la organización
                    var isDirectorAssigned = await _context.AgreementRequests
                        .AnyAsync(ar => ar.DirectorId == userId 
                            && ar.OrganizationId == application.InternshipOffer.OrganizationId 
                            && ar.Status == "Accepted");
                    
                    if (!isDirectorAssigned)
                    {
                        return Forbid("No tienes permisos para descargar esta carta de aceptación");
                    }
                }

                if (string.IsNullOrEmpty(application.AcceptanceLetterFilePath))
                {
                    return NotFound("No se encontró el archivo de carta de aceptación");
                }

                var filePath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads", "AcceptanceLetters", application.AcceptanceLetterFilePath);
                if (!System.IO.File.Exists(filePath))
                {
                    return NotFound("El archivo de carta de aceptación no existe en el servidor");
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                return File(fileBytes, "application/pdf", $"CartaAceptacion_{application.StudentId}_{application.InternshipOfferId}.pdf");
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

        // PUT: api/InternshipApplication/{id}/confirm-acceptance
        [HttpPut("{id}/confirm-acceptance")]
        [Authorize(Roles = "Student")]
        public async Task<IActionResult> ConfirmStudentAcceptance(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ia => ia.Student)
                    .ThenInclude(s => s.AppUser)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que la aplicación pertenece al estudiante
                if (application.StudentId != userId)
                {
                    return Forbid("No tienes permisos para confirmar esta aplicación");
                }

                // Verificar que el estado sea APROBADA
                if (application.Status != "APROBADA")
                {
                    return BadRequest("Solo se puede confirmar la aceptación cuando el estado es 'APROBADA'");
                }

                // Confirmar la aceptación del estudiante
                application.StudentAcceptanceConfirmed = true;
                application.StudentAcceptanceConfirmedDate = await _cloudTimeService.GetCloudTimeAsync();

                await _context.SaveChangesAsync();

                // Obtener el ID de la organización
                var organizationId = application.InternshipOffer.OrganizationId;

                // Crear notificación para la organización
                await _notificationService.CreateNotificationAsync(
                    organizationId,
                    "Aceptación Confirmada",
                    $"El estudiante {application.Student.AppUser?.FullName} ha confirmado su aceptación para la oferta '{application.InternshipOffer.Title}'.",
                    "STUDENT_ACCEPTANCE_CONFIRMED",
                    application.Id,
                    "InternshipApplication"
                );

                // Enviar notificación SignalR a la organización
                await _hubContext.Clients.Group($"user_{organizationId}").SendAsync("StudentAcceptanceConfirmed", new
                {
                    applicationId = application.Id,
                    studentId = application.StudentId,
                    studentName = application.Student.AppUser?.FullName,
                    offerTitle = application.InternshipOffer.Title,
                    confirmedDate = application.StudentAcceptanceConfirmedDate
                });

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

        // GET: api/InternshipApplication/director/acceptance-letters
        [HttpGet("director/acceptance-letters")]
        [Authorize(Roles = "Director")]
        public async Task<ActionResult<IEnumerable<InternshipApplicationResponse>>> GetAcceptanceLettersForDirector()
        {
            try
            {
                var directorId = User.Claims.First(c => c.Type == "userID").Value;

                // Obtener las organizaciones asignadas a este director a través de AgreementRequest
                var organizationIds = await _context.AgreementRequests
                    .Where(ar => ar.DirectorId == directorId && ar.Status == "Accepted")
                    .Select(ar => ar.OrganizationId)
                    .Distinct()
                    .ToListAsync();

                if (!organizationIds.Any())
                {
                    return Ok(new List<InternshipApplicationResponse>());
                }

                // Obtener las aplicaciones con carta de aceptación que pertenezcan a las organizaciones asignadas
                // Incluir tanto las pendientes (DirectorApprovalStatus == null) como las ya revisadas
                var applications = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ia => ia.Student)
                    .ThenInclude(s => s.AppUser)
                    .Where(ia => ia.AcceptanceLetterFilePath != null
                        && organizationIds.Contains(ia.InternshipOffer.OrganizationId))
                    .OrderByDescending(ia => ia.AcceptanceDate)
                    .Select(ia => new InternshipApplicationResponse
                    {
                        Id = ia.Id,
                        InternshipOfferId = ia.InternshipOfferId,
                        InternshipOfferTitle = ia.InternshipOffer.Title ?? "",
                        OrganizationName = ia.InternshipOffer.Organization.AppUser != null ? ia.InternshipOffer.Organization.AppUser.FullName : "",
                        StudentId = ia.StudentId,
                        StudentName = ia.Student.AppUser != null ? ia.Student.AppUser.FullName : "",
                        StudentCareer = ia.Student.AppUser != null ? ia.Student.AppUser.Career ?? "" : "",
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
                        InterviewNotes = ia.InterviewNotes,
                        InterviewAttendanceConfirmed = ia.InterviewAttendanceConfirmed,
                        AcceptanceLetterFilePath = ia.AcceptanceLetterFilePath,
                        AcceptanceNotes = ia.AcceptanceNotes,
                        AcceptanceDate = ia.AcceptanceDate,
                        StudentAcceptanceConfirmed = ia.StudentAcceptanceConfirmed,
                        StudentAcceptanceConfirmedDate = ia.StudentAcceptanceConfirmedDate,
                        EvaluationStatus = ia.EvaluationStatus,
                        DirectorApprovalStatus = ia.DirectorApprovalStatus,
                        DirectorApprovalDate = ia.DirectorApprovalDate,
                        DirectorApprovalNotes = ia.DirectorApprovalNotes
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

        // PUT: api/InternshipApplication/{id}/director-approval
        [HttpPut("{id}/director-approval")]
        [Authorize(Roles = "Director")]
        public async Task<IActionResult> ApproveOrRejectAcceptanceLetter(int id, [FromBody] DirectorApprovalRequest request)
        {
            try
            {
                var directorId = User.Claims.First(c => c.Type == "userID").Value;

                var application = await _context.InternshipApplications
                    .Include(ia => ia.InternshipOffer)
                    .ThenInclude(io => io.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ia => ia.Student)
                    .ThenInclude(s => s.AppUser)
                    .FirstOrDefaultAsync(ia => ia.Id == id);

                if (application == null)
                {
                    return NotFound("No se encontró la aplicación");
                }

                // Verificar que el director está asignado a la organización
                var isDirectorAssigned = await _context.AgreementRequests
                    .AnyAsync(ar => ar.DirectorId == directorId 
                        && ar.OrganizationId == application.InternshipOffer.OrganizationId 
                        && ar.Status == "Accepted");

                if (!isDirectorAssigned)
                {
                    return Forbid("No tienes permisos para revisar esta carta de aceptación");
                }

                // Verificar que el estado es REVISION y no ha sido aprobado/rechazado antes
                if (application.Status != "REVISION")
                {
                    return BadRequest("Solo se pueden revisar cartas de aceptación con estado 'REVISION'");
                }

                if (application.DirectorApprovalStatus != null)
                {
                    return BadRequest("Esta carta de aceptación ya ha sido revisada");
                }

                // Actualizar la aprobación del director
                application.DirectorApprovalStatus = request.Status;
                application.DirectorApprovalDate = await _cloudTimeService.GetCloudTimeAsync();
                application.DirectorApprovalNotes = request.Notes;

                // Si el director acepta, el estado debe ser "APROBADA" (aceptado por el director)
                // Si el director rechaza, mantener "REVISION" para que la organización pueda corregir
                if (request.Status == "Aceptado")
                {
                    application.Status = "APROBADA";
                }
                // Si es "Rechazado", mantener "REVISION" para que la organización pueda enviar una nueva carta

                await _context.SaveChangesAsync();

                // Obtener IDs de usuarios relacionados para notificaciones
                var organizationId = application.InternshipOffer.OrganizationId;
                var studentId = application.StudentId;

                // Crear notificaciones
                var statusText = request.Status == "Aceptado" ? "aceptada" : "rechazada";
                
                // Notificación para la organización
                await _notificationService.CreateNotificationAsync(
                    organizationId,
                    $"Carta de Aceptación {request.Status}",
                    $"El director ha {statusText} la carta de aceptación para el estudiante {application.Student.AppUser?.FullName} en la oferta '{application.InternshipOffer.Title}'.",
                    "DIRECTOR_APPROVAL",
                    application.Id,
                    "InternshipApplication"
                );

                // Notificación para el estudiante
                await _notificationService.CreateNotificationAsync(
                    studentId,
                    $"Carta de Aceptación {request.Status}",
                    $"El director ha {statusText} la carta de aceptación para tu postulación a la oferta '{application.InternshipOffer.Title}'.",
                    "DIRECTOR_APPROVAL",
                    application.Id,
                    "InternshipApplication"
                );

                // Enviar notificaciones SignalR
                await _hubContext.Clients.Group($"user_{organizationId}").SendAsync("DirectorApprovalUpdated", new
                {
                    applicationId = application.Id,
                    status = request.Status,
                    studentName = application.Student.AppUser?.FullName,
                    offerTitle = application.InternshipOffer.Title
                });

                await _hubContext.Clients.Group($"user_{studentId}").SendAsync("DirectorApprovalUpdated", new
                {
                    applicationId = application.Id,
                    status = request.Status,
                    organizationName = application.InternshipOffer.Organization.AppUser?.FullName,
                    offerTitle = application.InternshipOffer.Title
                });

                return Ok(new
                {
                    message = $"Carta de aceptación {statusText} exitosamente",
                    status = application.Status,
                    directorApprovalStatus = application.DirectorApprovalStatus
                });
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
        [RegularExpression("ENTREVISTA|APROBADA|RECHAZADA", ErrorMessage = "Status solo puede ser 'ENTREVISTA', 'APROBADA' o 'RECHAZADA'")]
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
        
        [StringLength(1000, ErrorMessage = "La nota para el estudiante no puede exceder 1000 caracteres")]
        public string? InterviewNotes { get; set; }
    }

    public class ConfirmAttendanceRequest
    {
        [Required]
        public bool WillAttend { get; set; }
    }

    public class ConsolidateAcceptanceRequest
    {
        [Required]
        public IFormFile AcceptanceLetter { get; set; }
        
        public string? AcceptanceNotes { get; set; }
    }

    public class DirectorApprovalRequest
    {
        [Required]
        [RegularExpression("Aceptado|Rechazado", ErrorMessage = "Status solo puede ser 'Aceptado' o 'Rechazado'")]
        public string Status { get; set; }
        
        public string? Notes { get; set; }
    }
} 