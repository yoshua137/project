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
                .Select(d => new {
                    Id = d.Id,
                    FullName = d.AppUser.FullName,
                    Gender = d.AppUser.Gender,
                    DOB = d.AppUser.DOB,
                    Department = d.Department
                })
                .ToListAsync();

            return Ok(directors);
        }
    }
} 