using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using AuthECAPI.Services;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class RegistrationInvitationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICloudTimeService _cloudTimeService;

        public RegistrationInvitationController(AppDbContext context, ICloudTimeService cloudTimeService)
        {
            _context = context;
            _cloudTimeService = cloudTimeService;
        }

        // POST: api/RegistrationInvitation/generate
        [HttpPost("generate")]
        public async Task<ActionResult<object>> GenerateInvitation([FromBody] GenerateInvitationRequest request)
        {
            try
            {
                // Validar el rol
                if (request.Role != "Teacher" && request.Role != "Director")
                {
                    return BadRequest("El rol debe ser 'Teacher' o 'Director'");
                }

                // Obtener el ID del administrador que crea la invitación
                var adminUserId = User.Claims.First(c => c.Type == "userID").Value;

                // Generar token único
                var token = GenerateUniqueToken();

                // Crear la invitación
                var nowUtc = _cloudTimeService.Now;
                var invitation = new RegistrationInvitation
                {
                    Token = token,
                    Role = request.Role,
                    CreatedAt = nowUtc,
                    ExpiresAt = nowUtc.AddDays(1), // Expira en 1 día
                    CreatedByUserId = adminUserId
                };

                _context.RegistrationInvitations.Add(invitation);
                await _context.SaveChangesAsync();

                // Generar la URL de registro
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var registrationUrl = $"{baseUrl}/user/registration?token={token}&role={request.Role}";

                return Ok(new
                {
                    token = token,
                    role = request.Role,
                    expiresAt = invitation.ExpiresAt,
                    registrationUrl = registrationUrl
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/RegistrationInvitation/validate/{token}
        [HttpGet("validate/{token}")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> ValidateInvitation(string token)
        {
            var invitation = await _context.RegistrationInvitations
                .FirstOrDefaultAsync(i => i.Token == token);

            if (invitation == null)
            {
                return NotFound("Token de invitación no encontrado");
            }

            if (invitation.IsUsed)
            {
                return BadRequest("Este token ya ha sido utilizado");
            }

            var nowUtc = _cloudTimeService.Now;
            if (nowUtc > invitation.ExpiresAt)
            {
                return BadRequest("Este token ha expirado");
            }

            return Ok(new
            {
                role = invitation.Role,
                expiresAt = invitation.ExpiresAt
            });
        }

        // GET: api/RegistrationInvitation/list
        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<object>>> GetInvitations()
        {
            var invitations = await _context.RegistrationInvitations
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    token = i.Token,
                    role = i.Role,
                    createdAt = i.CreatedAt,
                    expiresAt = i.ExpiresAt,
                    isUsed = i.IsUsed,
                    usedAt = i.UsedAt
                })
                .ToListAsync();

            return Ok(invitations);
        }

        private string GenerateUniqueToken()
        {
            using (var rng = RandomNumberGenerator.Create())
            {
                var bytes = new byte[32];
                rng.GetBytes(bytes);
                return Convert.ToBase64String(bytes)
                    .Replace("+", "-")
                    .Replace("/", "_")
                    .Replace("=", "")
                    .Substring(0, 32);
            }
        }
    }

    public class GenerateInvitationRequest
    {
        [Required]
        public string Role { get; set; } = string.Empty;
    }
} 