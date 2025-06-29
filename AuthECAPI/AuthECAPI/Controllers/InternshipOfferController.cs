using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using System.Security.Claims;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InternshipOfferController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InternshipOfferController(AppDbContext context)
        {
            _context = context;
        }

        // POST: api/InternshipOffer
        [HttpPost]
        [Authorize(Roles = "Organization", Policy = "HasAcceptedAgreement")]
        public async Task<ActionResult<InternshipOfferResponse>> CreateInternshipOffer(CreateInternshipOfferRequest offerRequest)
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

                // Validar fechas
                if (offerRequest.StartDate >= offerRequest.EndDate)
                {
                    return BadRequest("La fecha de inicio debe ser anterior a la fecha de fin");
                }

                if (offerRequest.StartDate < DateTime.Today)
                {
                    return BadRequest("La fecha de inicio no puede ser en el pasado");
                }

                var internshipOffer = new InternshipOffer
                {
                    Title = offerRequest.Title,
                    Description = offerRequest.Description,
                    Requirements = offerRequest.Requirements,
                    StartDate = offerRequest.StartDate,
                    EndDate = offerRequest.EndDate,
                    OrganizationId = userId,
                    Mode = offerRequest.Mode,
                    Career = offerRequest.Career,
                    ContactEmail = offerRequest.ContactEmail,
                    ContactPhone = offerRequest.ContactPhone
                };

                _context.InternshipOffers.Add(internshipOffer);
                await _context.SaveChangesAsync();

                var offerResponse = new InternshipOfferResponse
                {
                    Id = internshipOffer.Id,
                    Title = internshipOffer.Title,
                    Description = internshipOffer.Description,
                    Requirements = internshipOffer.Requirements,
                    StartDate = internshipOffer.StartDate,
                    EndDate = internshipOffer.EndDate,
                    OrganizationId = internshipOffer.OrganizationId,
                    OrganizationName = organization.AppUser?.FullName,
                    Mode = internshipOffer.Mode,
                    Career = internshipOffer.Career,
                    ContactEmail = internshipOffer.ContactEmail,
                    ContactPhone = internshipOffer.ContactPhone
                };

                return CreatedAtAction(nameof(CreateInternshipOffer), new { id = offerResponse.Id }, offerResponse);
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

        // GET: api/InternshipOffer?career=Ingenieria de Sistemas
        [HttpGet]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<InternshipOfferResponse>>> GetInternshipOffers([FromQuery] string? career = null)
        {
            var query = _context.InternshipOffers.Include(io => io.Organization).ThenInclude(o => o.AppUser).AsQueryable();
            if (!string.IsNullOrEmpty(career))
            {
                query = query.Where(io => io.Career.ToLower() == career.ToLower());
            }
            var offers = await query
                .Select(io => new InternshipOfferResponse
                {
                    Id = io.Id,
                    Title = io.Title,
                    Description = io.Description,
                    Requirements = io.Requirements,
                    StartDate = io.StartDate,
                    EndDate = io.EndDate,
                    OrganizationId = io.OrganizationId,
                    OrganizationName = io.Organization.AppUser != null ? io.Organization.AppUser.FullName : null,
                    Mode = io.Mode,
                    Career = io.Career,
                    ContactEmail = io.ContactEmail,
                    ContactPhone = io.ContactPhone
                })
                .ToListAsync();
            return Ok(offers);
        }

        // GET: api/InternshipOffer/my-offers
        [HttpGet("my-offers")]
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<IEnumerable<InternshipOfferResponse>>> GetMyInternshipOffers()
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;
                var organization = await _context.Organizations.Include(o => o.AppUser).FirstOrDefaultAsync(o => o.Id == userId);
                if (organization == null)
                {
                    return BadRequest("No se encontró la organización para el usuario actual");
                }
                var offers = await _context.InternshipOffers
                    .Where(io => io.OrganizationId == userId)
                    .OrderByDescending(io => io.StartDate)
                    .Select(io => new InternshipOfferResponse
                    {
                        Id = io.Id,
                        Title = io.Title,
                        Description = io.Description,
                        Requirements = io.Requirements,
                        StartDate = io.StartDate,
                        EndDate = io.EndDate,
                        OrganizationId = io.OrganizationId,
                        OrganizationName = organization.AppUser.FullName,
                        Mode = io.Mode,
                        Career = io.Career,
                        ContactEmail = io.ContactEmail,
                        ContactPhone = io.ContactPhone
                    })
                    .ToListAsync();
                return Ok(offers);
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
        [HttpDelete("{id}")]
        [Authorize(Roles = "Organization")]
        public async Task<IActionResult> DeleteInternshipOffer(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;
                var internshipOffer = await _context.InternshipOffers.FirstOrDefaultAsync(io => io.Id == id);
                if (internshipOffer == null)
                    return NotFound("No se encontró la oferta de pasantía");
                if (internshipOffer.OrganizationId != userId)
                    return Forbid("No tienes permisos para eliminar esta oferta de pasantía");
                _context.InternshipOffers.Remove(internshipOffer);
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

        [HttpPut("{id}")]
        [Authorize(Roles = "Organization")]
        public async Task<IActionResult> UpdateInternshipOffer(int id, [FromBody] CreateInternshipOfferRequest offerRequest)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;
                var internshipOffer = await _context.InternshipOffers.FirstOrDefaultAsync(io => io.Id == id);

                if (internshipOffer == null)
                    return NotFound("No se encontró la oferta de pasantía");

                if (internshipOffer.OrganizationId != userId)
                    return Forbid("No tienes permisos para editar esta oferta de pasantía");

                // Validar fechas
                if (offerRequest.StartDate >= offerRequest.EndDate)
                    return BadRequest("La fecha de inicio debe ser anterior a la fecha de fin");

                if (offerRequest.StartDate < DateTime.Today)
                    return BadRequest("La fecha de inicio no puede ser en el pasado");

                // Actualizar campos
                internshipOffer.Title = offerRequest.Title;
                internshipOffer.Description = offerRequest.Description;
                internshipOffer.Requirements = offerRequest.Requirements;
                internshipOffer.StartDate = offerRequest.StartDate;
                internshipOffer.EndDate = offerRequest.EndDate;
                internshipOffer.Mode = offerRequest.Mode;
                internshipOffer.Career = offerRequest.Career;
                internshipOffer.ContactEmail = offerRequest.ContactEmail;
                internshipOffer.ContactPhone = offerRequest.ContactPhone;

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
    }
} 