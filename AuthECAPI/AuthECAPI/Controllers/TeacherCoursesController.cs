using AuthECAPI.Models;
using AuthECAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace AuthECAPI.Controllers
{
    [Authorize(Roles = "Teacher")]
    [ApiController]
    [Route("api/TeacherCourses")]
    public class TeacherCoursesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICloudTimeService _cloudTimeService;

        public TeacherCoursesController(AppDbContext context, ICloudTimeService cloudTimeService)
        {
            _context = context;
            _cloudTimeService = cloudTimeService;
        }

        [HttpPost]
        public async Task<IActionResult> CreateCourseForCurrentTerm()
        {
            var teacherId = User.Claims.FirstOrDefault(c => c.Type == "userID")?.Value;
            if (string.IsNullOrEmpty(teacherId))
            {
                return Unauthorized();
            }

            // Usar helper de hora (zona Bolivia) para registrar
            var now = _cloudTimeService.Now;
            var term = GetCurrentTerm(now);

            // Try generate a unique 6-digit code and insert
            var attempt = 0;
            const int maxAttempts = 20;
            while (attempt++ < maxAttempts)
            {
                var code = GenerateSixDigitCode();
                try
                {
                    if (await _context.TeacherCourses.AnyAsync(c => c.Code == code))
                        continue;

                    var course = new TeacherCourse
                    {
                        Code = code,
                        Term = term,
                        TeacherId = teacherId,
                        CreatedAtUtc = now
                    };
                    _context.TeacherCourses.Add(course);
                    await _context.SaveChangesAsync();
                    return Ok(new { code, term, createdAtUtc = now });
                }
                catch (DbUpdateException)
                {
                    // Retry on any transient/unique violations
                }
            }

            return StatusCode(500, new { message = "No se pudo generar un código único. Intenta de nuevo." });
        }

        [HttpGet("mine")]
        public async Task<IActionResult> GetMyCourses()
        {
            var teacherId = User.Claims.FirstOrDefault(c => c.Type == "userID")?.Value;
            if (string.IsNullOrEmpty(teacherId))
            {
                return Unauthorized();
            }

            var courses = await _context.TeacherCourses
                .AsNoTracking()
                .Where(tc => tc.TeacherId == teacherId)
                .OrderByDescending(tc => tc.CreatedAtUtc)
                .Select(tc => new
                {
                    id = tc.Id,
                    code = tc.Code,
                    term = tc.Term,
                    createdAtUtc = tc.CreatedAtUtc
                })
                .ToListAsync();

            return Ok(courses);
        }

        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteCourse(Guid id)
        {
            var teacherId = User.Claims.FirstOrDefault(c => c.Type == "userID")?.Value;
            if (string.IsNullOrEmpty(teacherId))
            {
                return Unauthorized();
            }

            var course = await _context.TeacherCourses.FirstOrDefaultAsync(c => c.Id == id);
            if (course == null)
            {
                return NotFound();
            }
            if (course.TeacherId != teacherId)
            {
                return Forbid();
            }

            var hasStudents = await _context.StudentCourses.AnyAsync(sc => sc.CourseId == id);
            if (hasStudents)
            {
                return Conflict(new { message = "No se puede eliminar el curso porque tiene estudiantes inscritos." });
            }

            _context.TeacherCourses.Remove(course);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("{id:guid}/students")]
        public async Task<IActionResult> GetStudents(Guid id)
        {
            var teacherId = User.Claims.FirstOrDefault(c => c.Type == "userID")?.Value;
            if (string.IsNullOrEmpty(teacherId))
            {
                return Unauthorized();
            }

            var course = await _context.TeacherCourses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
            if (course == null) return NotFound();
            if (course.TeacherId != teacherId) return Forbid();

            // Traer estudiantes inscritos y un resumen de su última postulación si existe
            var students = await _context.StudentCourses
                .AsNoTracking()
                .Where(sc => sc.CourseId == id)
                .Select(sc => new
                {
                    assignedAtUtc = sc.AssignedAtUtc,
                    student = sc.Student
                })
                .Select(x => new
                {
                    studentId = x.student.Id,
                    fullName = x.student.AppUser.FullName,
                    email = x.student.AppUser.Email,
                    career = x.student.AppUser.Career,
                    assignedAtUtc = x.assignedAtUtc,
                    lastApplication = x.student.InternshipApplications
                        .OrderByDescending(a => a.ApplicationDate)
                        .Select(a => new
                        {
                            applicationId = a.Id,
                            status = a.Status,
                            applicationDate = a.ApplicationDate,
                            organizationId = a.InternshipOffer.OrganizationId,
                            organizationName = a.InternshipOffer.Organization.AppUser.FullName,
                            offer = new
                            {
                                id = a.InternshipOfferId,
                                title = a.InternshipOffer.Title,
                                career = a.InternshipOffer.Career,
                                mode = a.InternshipOffer.Mode,
                                startDate = a.InternshipOffer.StartDate,
                                endDate = a.InternshipOffer.EndDate,
                                contactEmail = a.InternshipOffer.ContactEmail,
                                contactPhone = a.InternshipOffer.ContactPhone,
                            },
                            // Convenio: tomar el último registro de convenios con esa organización (si existiera)
                            agreementStatus = _context.AgreementRequests
                                .Where(ar => ar.OrganizationId == a.InternshipOffer.OrganizationId)
                                .OrderByDescending(ar => ar.ReviewDate)
                                .Select(ar => ar.Status)
                                .FirstOrDefault(),
                            cvFilePath = a.CVFilePath,
                            interviewDateTime = a.InterviewDateTime,
                            interviewMode = a.InterviewMode,
                            interviewLink = a.InterviewLink,
                            interviewAddress = a.InterviewAddress,
                            virtualMeetingLink = a.VirtualMeetingLink,
                            reviewNotes = a.ReviewNotes,
                            reviewDate = a.ReviewDate
                        })
                        .FirstOrDefault(),
                    applications = x.student.InternshipApplications
                        .OrderByDescending(a => a.ApplicationDate)
                        .Select(a => new
                        {
                            id = a.Id,
                            status = a.Status,
                            applicationDate = a.ApplicationDate,
                            offerTitle = a.InternshipOffer.Title,
                            organizationName = a.InternshipOffer.Organization.AppUser.FullName
                        })
                        .ToList()
                })
                .ToListAsync();

            return Ok(students);
        }

        [HttpGet("validate/{code}")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateCode(string code)
        {
            // Código válido: exactamente 6 dígitos
            if (string.IsNullOrWhiteSpace(code) || code.Length != 6 || !code.All(char.IsDigit))
            {
                return Ok(new { valid = false, message = "El código debe tener 6 dígitos." });
            }

            var course = await _context.TeacherCourses
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Code == code);

            if (course == null)
            {
                return Ok(new { valid = false, message = "Código de curso no encontrado." });
            }

            return Ok(new { valid = true, term = course.Term });
        }

        private static string GetCurrentTerm(DateTime now)
        {
            var semester = now.Month <= 6 ? "I" : "II";
            return $"{semester}-{now.Year}";
        }

        private static string GenerateSixDigitCode()
        {
            // 6 digits, no leading zero guarantee by range 100000..999999
            var rng = Random.Shared.Next(100000, 1000000);
            return rng.ToString();
        }
    }
}

