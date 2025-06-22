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
        [Authorize(Roles = "Organization")]
        public async Task<ActionResult<InternshipOffer>> CreateInternshipOffer(CreateInternshipOfferRequest offerRequest)
        {
            try
            {
                // Obtener el ID del usuario actual (idéntico a AccountEndpoints.cs)
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                // Verificar que la organización existe y pertenece al usuario actual
                var organization = await _context.Organizations
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
                    OrganizationId = userId
                };

                _context.InternshipOffers.Add(internshipOffer);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(CreateInternshipOffer), new { id = internshipOffer.Id }, internshipOffer);
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