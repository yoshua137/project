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
                    OrganizationId = userId
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
                    OrganizationName = organization.AppUser?.FullName
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
    }
} 