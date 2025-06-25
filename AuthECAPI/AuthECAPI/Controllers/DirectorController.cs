using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using System.Threading.Tasks;
using System.Linq;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DirectorController : ControllerBase
    {
        private readonly AppDbContext _context;

        public DirectorController(AppDbContext context)
        {
            _context = context;
        }

        // GET: api/Director
        [HttpGet]
        public async Task<IActionResult> GetDirectors()
        {
            var directors = await _context.Directors
                .Include(d => d.AppUser)
                .Where(d => d.AppUser != null)
                .Select(d => new {
                    id = d.Id,
                    fullName = d.AppUser.FullName,
                    gender = d.AppUser.Gender,
                    dob = d.AppUser.DOB.ToString(),
                    department = d.Department,
                    career = d.AppUser.Career
                })
                .ToListAsync();

            return Ok(directors);
        }
    }
} 