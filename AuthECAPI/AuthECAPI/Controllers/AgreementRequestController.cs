using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using AuthECAPI.Services;
using AuthECAPI.Hubs;
using System.Security.Claims;
using System.IO;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class AgreementRequestController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _environment;
        private readonly ICloudTimeService _cloudTimeService;
        private readonly INotificationService _notificationService;
        private readonly IHubContext<InternshipNotificationHub> _hubContext;

        public AgreementRequestController(AppDbContext context, IWebHostEnvironment environment, ICloudTimeService cloudTimeService, INotificationService notificationService, IHubContext<InternshipNotificationHub> hubContext)
        {
            _context = context;
            _environment = environment;
            _cloudTimeService = cloudTimeService;
            _notificationService = notificationService;
            _hubContext = hubContext;
        }

        // POST: api/AgreementRequest
        [HttpPost]
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<AgreementRequestResponse>> CreateAgreementRequest([FromForm] CreateAgreementRequestRequest request)
        {
            try
            {
                // Obtener el ID del usuario actual (idéntico a AccountEndpoints.cs)
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                // Verificar que la organización existe y pertenece al usuario actual
                var organization = await _context.Organizations
                    .Include(o => o.AppUser) // Cargar AppUser para obtener el nombre
                    .FirstOrDefaultAsync(o => o.Id == userId);

                if (organization == null)
                {
                    return BadRequest("No se encontró la organización para el usuario actual");
                }

                // Verificar que el director existe
                var director = await _context.Directors
                    .Include(d => d.AppUser) // Cargar AppUser para obtener el nombre
                    .FirstOrDefaultAsync(d => d.Id == request.DirectorId);

                if (director == null)
                {
                    return BadRequest("No se encontró el director especificado");
                }

                // Validar el archivo PDF
                if (request.PdfFile == null || request.PdfFile.Length == 0)
                {
                    return BadRequest("El archivo PDF es requerido");
                }

                if (!request.PdfFile.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest("Solo se permiten archivos PDF");
                }

                if (request.PdfFile.Length > 10 * 1024 * 1024) // 10MB máximo
                {
                    return BadRequest("El archivo PDF no puede ser mayor a 10MB");
                }

                // Crear directorio para guardar archivos si no existe
                var uploadsPath = Path.Combine(_environment.ContentRootPath, "Uploads", "AgreementRequests");
                if (!Directory.Exists(uploadsPath))
                {
                    Directory.CreateDirectory(uploadsPath);
                }

                // Generar nombre único para el archivo
                var fileName = $"{Guid.NewGuid()}_{_cloudTimeService.Now:yyyyMMddHHmmss}.pdf";
                var filePath = Path.Combine(uploadsPath, fileName);

                // Guardar el archivo
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await request.PdfFile.CopyToAsync(stream);
                }

                var agreementRequest = new AgreementRequest
                {
                    OrganizationId = userId,
                    DirectorId = request.DirectorId,
                    RequestDate = _cloudTimeService.Now,
                    Status = "Pending", // Estado inicial
                    Description = request.Description,
                    PdfFilePath = fileName // Guardar solo el nombre del archivo
                };

                _context.AgreementRequests.Add(agreementRequest);
                await _context.SaveChangesAsync();

                // Crear notificación persistente y enviar notificación en tiempo real al director
                await _notificationService.CreateNotificationAsync(
                    agreementRequest.DirectorId,
                    "Nueva Solicitud de Convenio",
                    $"La organización '{organization.AppUser?.FullName ?? "Organización"}' ha enviado una nueva solicitud de convenio para el departamento '{director.Department}'.",
                    "AGREEMENT_REQUEST_RECEIVED",
                    agreementRequest.Id,
                    "AgreementRequest"
                );

                // Enviar notificación en tiempo real al director
                await _hubContext.Clients.Group($"user_{agreementRequest.DirectorId}").SendAsync("AgreementRequestReceived", new
                {
                    agreementRequestId = agreementRequest.Id,
                    organizationName = organization.AppUser?.FullName ?? "Organización",
                    department = director.Department,
                    requestDate = agreementRequest.RequestDate
                });

                var response = new AgreementRequestResponse
                {
                    Id = agreementRequest.Id,
                    OrganizationId = agreementRequest.OrganizationId,
                    OrganizationName = organization.AppUser != null ? organization.AppUser.FullName : null,
                    DirectorId = agreementRequest.DirectorId,
                    DirectorName = director.AppUser != null ? director.AppUser.FullName : null,
                    DirectorDepartment = director.Department,
                    RequestDate = agreementRequest.RequestDate,
                    ReviewDate = agreementRequest.ReviewDate,
                    Status = agreementRequest.Status,
                    Description = agreementRequest.Description,
                    PdfFilePath = agreementRequest.PdfFilePath
                };

                return CreatedAtAction(nameof(CreateAgreementRequest), new { id = response.Id }, response);
            }
            catch (InvalidOperationException)
            {
                // Este error ocurre si el claim "userID" no se encuentra en el token
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/AgreementRequest/director/{directorId}
        [HttpGet("director/{directorId}")]
        [Authorize(Roles = "Director")]
        public async Task<ActionResult<IEnumerable<AgreementRequestResponse>>> GetAgreementRequestsForDirector(string directorId)
        {
            try
            {
                // Verificar que el director actual es el propietario de las solicitudes
                var currentUserId = User.Claims.First(c => c.Type == "userID").Value;
                if (currentUserId != directorId)
                {
                    return Forbid("Solo puede ver las solicitudes asignadas a su cuenta");
                }

                var agreementRequests = await _context.AgreementRequests
                    .Include(ar => ar.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ar => ar.Director)
                    .ThenInclude(d => d.AppUser)
                    .Where(ar => ar.DirectorId == directorId)
                    .OrderByDescending(ar => ar.RequestDate)
                    .Select(ar => new AgreementRequestResponse
                    {
                        Id = ar.Id,
                        OrganizationId = ar.OrganizationId,
                        OrganizationName = ar.Organization.AppUser != null ? ar.Organization.AppUser.FullName : null,
                        DirectorId = ar.DirectorId,
                        DirectorName = ar.Director.AppUser != null ? ar.Director.AppUser.FullName : null,
                        DirectorDepartment = ar.Director.Department,
                        RequestDate = ar.RequestDate,
                        ReviewDate = ar.ReviewDate,
                        Status = ar.Status,
                        Description = ar.Description,
                        PdfFilePath = ar.PdfFilePath
                    })
                    .ToListAsync();

                return Ok(agreementRequests);
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

        // PUT: api/AgreementRequest/review
        [HttpPut("review")]
        [Authorize(Roles = "Director")]
        public async Task<ActionResult<AgreementRequestResponse>> ReviewAgreementRequest([FromBody] ReviewAgreementRequest request)
        {
            try
            {
                // Validar la decisión
                if (request.Decision != "Accepted" && request.Decision != "Rejected")
                {
                    return BadRequest("La decisión debe ser 'Accepted' o 'Rejected'");
                }

                // Obtener el ID del director actual
                var currentUserId = User.Claims.First(c => c.Type == "userID").Value;

                // Buscar la solicitud de convenio
                var agreementRequest = await _context.AgreementRequests
                    .Include(ar => ar.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ar => ar.Director)
                    .ThenInclude(d => d.AppUser)
                    .FirstOrDefaultAsync(ar => ar.Id == request.AgreementRequestId);

                if (agreementRequest == null)
                {
                    return NotFound("Solicitud de convenio no encontrada");
                }

                // Verificar que el director actual es el asignado a esta solicitud
                if (agreementRequest.DirectorId != currentUserId)
                {
                    return Forbid("Solo puede revisar las solicitudes asignadas a su cuenta");
                }

                // Verificar que la solicitud está pendiente
                if (agreementRequest.Status != "Pending")
                {
                    return BadRequest("Solo se pueden revisar solicitudes con estado 'Pending'");
                }

                // Actualizar la solicitud
                agreementRequest.Status = request.Decision;
                agreementRequest.ReviewDate = _cloudTimeService.Now;

                // Si se acepta, actualizar el estado a "Accepted"
                // Si se rechaza, actualizar el estado a "Rejected"
                await _context.SaveChangesAsync();

                // Crear notificación para la organización
                if (request.Decision == "Accepted")
                {
                    await _notificationService.CreateNotificationAsync(
                        agreementRequest.OrganizationId,
                        "Convenio Aprobado",
                        $"Tu solicitud de convenio con el departamento '{agreementRequest.Director.Department}' ha sido aprobada.",
                        "AGREEMENT_APPROVED",
                        agreementRequest.Id,
                        "AgreementRequest"
                    );
                }
                else if (request.Decision == "Rejected")
                {
                    await _notificationService.CreateNotificationAsync(
                        agreementRequest.OrganizationId,
                        "Convenio Rechazado",
                        $"Tu solicitud de convenio con el departamento '{agreementRequest.Director.Department}' ha sido rechazada.",
                        "AGREEMENT_REJECTED",
                        agreementRequest.Id,
                        "AgreementRequest"
                    );
                }

                var response = new AgreementRequestResponse
                {
                    Id = agreementRequest.Id,
                    OrganizationId = agreementRequest.OrganizationId,
                    OrganizationName = agreementRequest.Organization.AppUser != null ? agreementRequest.Organization.AppUser.FullName : null,
                    DirectorId = agreementRequest.DirectorId,
                    DirectorName = agreementRequest.Director.AppUser != null ? agreementRequest.Director.AppUser.FullName : null,
                    DirectorDepartment = agreementRequest.Director.Department,
                    RequestDate = agreementRequest.RequestDate,
                    ReviewDate = agreementRequest.ReviewDate,
                    Status = agreementRequest.Status,
                    Description = agreementRequest.Description,
                    PdfFilePath = agreementRequest.PdfFilePath
                };

                return Ok(response);
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

        // GET: api/AgreementRequest/{id}
        [HttpGet("{id}")]
        [Authorize(Roles = "Director,Organization")]
        public async Task<ActionResult<AgreementRequestResponse>> GetAgreementRequest(int id)
        {
            try
            {
                var currentUserId = User.Claims.First(c => c.Type == "userID").Value;

                var agreementRequest = await _context.AgreementRequests
                    .Include(ar => ar.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ar => ar.Director)
                    .ThenInclude(d => d.AppUser)
                    .FirstOrDefaultAsync(ar => ar.Id == id);

                if (agreementRequest == null)
                {
                    return NotFound("Solicitud de convenio no encontrada");
                }

                // Verificar que el usuario actual tiene acceso a esta solicitud
                var userRole = User.Claims.First(c => c.Type == "role").Value;
                if (userRole == "Director" && agreementRequest.DirectorId != currentUserId)
                {
                    return Forbid("No tiene acceso a esta solicitud");
                }
                else if (userRole == "Organization" && agreementRequest.OrganizationId != currentUserId)
                {
                    return Forbid("No tiene acceso a esta solicitud");
                }

                var response = new AgreementRequestResponse
                {
                    Id = agreementRequest.Id,
                    OrganizationId = agreementRequest.OrganizationId,
                    OrganizationName = agreementRequest.Organization.AppUser != null ? agreementRequest.Organization.AppUser.FullName : null,
                    DirectorId = agreementRequest.DirectorId,
                    DirectorName = agreementRequest.Director.AppUser != null ? agreementRequest.Director.AppUser.FullName : null,
                    DirectorDepartment = agreementRequest.Director.Department,
                    RequestDate = agreementRequest.RequestDate,
                    ReviewDate = agreementRequest.ReviewDate,
                    Status = agreementRequest.Status,
                    Description = agreementRequest.Description,
                    PdfFilePath = agreementRequest.PdfFilePath
                };

                return Ok(response);
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

        // GET: api/AgreementRequest/pdf/{fileName}
        [HttpGet("pdf/{fileName}")]
        [Authorize(Roles = "Director,Organization")]
        public async Task<IActionResult> GetPdfFile(string fileName)
        {
            try
            {
                // LOG: Imprimir todos los claims del usuario
                Console.WriteLine("[PDF] Claims del usuario:");
                foreach (var claim in User.Claims)
                {
                    Console.WriteLine($"[PDF] Claim: {claim.Type} = {claim.Value}");
                }

                // Obtener el ID del usuario actual y el rol de forma segura
                var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userID");
                var roleClaim = User.Claims.FirstOrDefault(c =>
                    c.Type == "role" ||
                    c.Type == ClaimTypes.Role ||
                    c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
                );

                if (userIdClaim == null || roleClaim == null)
                {
                    Console.WriteLine("[PDF] Claim 'userID' o 'role' no encontrado en el token.");
                    return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID' o 'role'.");
                }

                var currentUserId = userIdClaim.Value;
                var userRole = roleClaim.Value;

                // Buscar la solicitud que contiene este archivo
                var agreementRequest = await _context.AgreementRequests
                    .FirstOrDefaultAsync(ar => ar.PdfFilePath == fileName);

                if (agreementRequest == null)
                {
                    Console.WriteLine($"[PDF] Solicitud no encontrada para archivo: {fileName}");
                    return NotFound("Solicitud no encontrada");
                }

                // Validar el nombre del archivo para evitar path traversal
                if (string.IsNullOrEmpty(fileName) || fileName.Contains("..") || fileName.Contains("/") || fileName.Contains("\\"))
                {
                    Console.WriteLine($"[PDF] Nombre de archivo inválido: {fileName}");
                    return BadRequest("Nombre de archivo inválido");
                }

                var filePath = Path.Combine(_environment.ContentRootPath, "Uploads", "AgreementRequests", fileName);
                Console.WriteLine($"[PDF] Buscando archivo en: {filePath}");
                
                if (!System.IO.File.Exists(filePath))
                {
                    Console.WriteLine($"[PDF] Archivo NO encontrado: {filePath}");
                    return NotFound("Archivo no encontrado");
                }
                else
                {
                    Console.WriteLine($"[PDF] Archivo encontrado: {filePath}");
                }

                // Verificar que el usuario tiene acceso a este archivo
                if (userRole == "Director" && agreementRequest.DirectorId != currentUserId)
                {
                    Console.WriteLine($"[PDF] Permiso denegado: Director {currentUserId} no es dueño de la solicitud");
                    return Forbid("No tiene acceso a este archivo");
                }
                else if (userRole == "Organization" && agreementRequest.OrganizationId != currentUserId)
                {
                    Console.WriteLine($"[PDF] Permiso denegado: Organización {currentUserId} no es dueña de la solicitud");
                    return Forbid("No tiene acceso a este archivo");
                }

                var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
                Console.WriteLine($"[PDF] Archivo enviado correctamente: {fileName}");
                return File(fileBytes, "application/pdf");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PDF] Error al obtener el archivo: {ex.Message}");
                return StatusCode(500, $"Error al obtener el archivo: {ex.Message}");
            }
        }

        // GET: api/AgreementRequest/organization/mine
        [HttpGet("organization/mine")]
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<IEnumerable<AgreementRequestResponse>>> GetAgreementRequestsForOrganization()
        {
            try
            {
                var currentUserId = User.Claims.First(c => c.Type == "userID").Value;
                var agreementRequests = await _context.AgreementRequests
                    .Include(ar => ar.Organization)
                    .ThenInclude(o => o.AppUser)
                    .Include(ar => ar.Director)
                    .ThenInclude(d => d.AppUser)
                    .Where(ar => ar.OrganizationId == currentUserId)
                    .OrderByDescending(ar => ar.RequestDate)
                    .Select(ar => new AgreementRequestResponse
                    {
                        Id = ar.Id,
                        OrganizationId = ar.OrganizationId,
                        OrganizationName = ar.Organization.AppUser != null ? ar.Organization.AppUser.FullName : null,
                        DirectorId = ar.DirectorId,
                        DirectorName = ar.Director.AppUser != null ? ar.Director.AppUser.FullName : null,
                        DirectorDepartment = ar.Director.Department,
                        RequestDate = ar.RequestDate,
                        ReviewDate = ar.ReviewDate,
                        Status = ar.Status,
                        Description = ar.Description,
                        PdfFilePath = ar.PdfFilePath
                    })
                    .ToListAsync();

                return Ok(agreementRequests);
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

        // GET: api/AgreementRequest/organization/approved-departments
        [HttpGet("organization/approved-departments")]
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<IEnumerable<string>>> GetApprovedDepartmentsForOrganization()
        {
            try
            {
                var currentUserId = User.Claims.First(c => c.Type == "userID").Value;
                
                var approvedDepartments = await _context.AgreementRequests
                    .Include(ar => ar.Director)
                    .Where(ar => ar.OrganizationId == currentUserId && ar.Status == "Accepted")
                    .Select(ar => ar.Director.Department)
                    .Distinct()
                    .Where(dept => !string.IsNullOrEmpty(dept))
                    .ToListAsync();

                return Ok(approvedDepartments);
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
}