using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
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

        public AgreementRequestController(AppDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
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
                var fileName = $"{Guid.NewGuid()}_{DateTime.UtcNow:yyyyMMddHHmmss}.pdf";
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
                    RequestDate = DateTime.UtcNow,
                    Status = "Pending", // Estado inicial
                    Description = request.Description,
                    PdfFilePath = fileName // Guardar solo el nombre del archivo
                };

                _context.AgreementRequests.Add(agreementRequest);
                await _context.SaveChangesAsync();

                var response = new AgreementRequestResponse
                {
                    Id = agreementRequest.Id,
                    OrganizationId = agreementRequest.OrganizationId,
                    OrganizationName = organization.AppUser?.FullName,
                    DirectorId = agreementRequest.DirectorId,
                    DirectorName = director.AppUser?.FullName,
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
    }
} 