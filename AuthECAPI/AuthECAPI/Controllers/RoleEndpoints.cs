using AuthECAPI.Models;
using AuthECAPI.Services;
using AuthECAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace AuthECAPI.Controllers
{
    // Registration Models
    public class StudentRegistrationModel : UserRegistrationModel
    {
        public string? CV { get; set; }
        public string? CourseCode { get; set; }
    }

    public class TeacherRegistrationModel : UserRegistrationModel
    {
        public string InvitationToken { get; set; } = string.Empty;
    }

    public class DirectorRegistrationModel : UserRegistrationModel
    {
        public string? Department { get; set; }
        public string InvitationToken { get; set; } = string.Empty;
    }

    public class OrganizationRegistrationModel : UserRegistrationModel
    {
        public string? Area { get; set; }
    }

    // Modelo para crear un rol
    public class CreateRoleModel
    {
        public string Name { get; set; } = string.Empty;
    }

    // Modelo de respuesta para roles
    public class RoleResponse
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string NormalizedName { get; set; } = string.Empty;
    }

    public static class RoleEndpoints
    {
        public static IEndpointRouteBuilder MapRoleEndpoints(this IEndpointRouteBuilder app)
        {
            var endpoints = app.MapGroup("/signup");

            endpoints.MapPost("/student", CreateStudent);
            endpoints.MapPost("/teacher", CreateTeacher);
            endpoints.MapPost("/director", CreateDirector);
            endpoints.MapPost("/organization", CreateOrganization);

            // Endpoints para gestión de roles
            var roleEndpoints = app.MapGroup("/roles");
            roleEndpoints.MapPost("", CreateRole);
            roleEndpoints.MapGet("", GetAllRoles);
            roleEndpoints.MapGet("/{roleName}", GetRoleByName);
            roleEndpoints.MapDelete("/{roleName}", DeleteRole);

            return app;
        }

        /// <summary>
        /// Crea un nuevo rol en la tabla AspNetRoles
        /// </summary>
        [Authorize(Roles = "Admin")]
        private static async Task<IResult> CreateRole(
            RoleManager<IdentityRole> roleManager,
            [FromBody] CreateRoleModel model)
        {
            if (string.IsNullOrWhiteSpace(model.Name))
            {
                return Results.BadRequest("El nombre del rol es requerido");
            }

            // Verificar si el rol ya existe
            var roleExists = await roleManager.RoleExistsAsync(model.Name);
            if (roleExists)
            {
                return Results.BadRequest($"El rol '{model.Name}' ya existe");
            }

            // Crear el nuevo rol
            var role = new IdentityRole(model.Name);
            var result = await roleManager.CreateAsync(role);

            if (result.Succeeded)
            {
                var response = new RoleResponse
                {
                    Id = role.Id,
                    Name = role.Name ?? string.Empty,
                    NormalizedName = role.NormalizedName ?? string.Empty
                };
                return Results.Ok(response);
            }

            return Results.BadRequest(result.Errors);
        }

        /// <summary>
        /// Obtiene todos los roles
        /// </summary>
        [Authorize(Roles = "Admin")]
        private static Task<IResult> GetAllRoles(
            RoleManager<IdentityRole> roleManager)
        {
            var roles = roleManager.Roles.ToList();
            var response = roles.Select(r => new RoleResponse
            {
                Id = r.Id,
                Name = r.Name ?? string.Empty,
                NormalizedName = r.NormalizedName ?? string.Empty
            }).ToList();

            return Task.FromResult(Results.Ok(response));
        }

        /// <summary>
        /// Obtiene un rol por nombre
        /// </summary>
        [Authorize(Roles = "Admin")]
        private static async Task<IResult> GetRoleByName(
            RoleManager<IdentityRole> roleManager,
            string roleName)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null)
            {
                return Results.NotFound($"El rol '{roleName}' no existe");
            }

            var response = new RoleResponse
            {
                Id = role.Id,
                Name = role.Name ?? string.Empty,
                NormalizedName = role.NormalizedName ?? string.Empty
            };

            return Results.Ok(response);
        }

        /// <summary>
        /// Elimina un rol
        /// </summary>
        [Authorize(Roles = "Admin")]
        private static async Task<IResult> DeleteRole(
            RoleManager<IdentityRole> roleManager,
            string roleName)
        {
            var role = await roleManager.FindByNameAsync(roleName);
            if (role == null)
            {
                return Results.NotFound($"El rol '{roleName}' no existe");
            }

            var result = await roleManager.DeleteAsync(role);
            if (result.Succeeded)
            {
                return Results.Ok($"Rol '{roleName}' eliminado correctamente");
            }

            return Results.BadRequest(result.Errors);
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateStudent(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            ICloudTimeService cloudTimeService,
            IHubContext<InternshipNotificationHub> hubContext,
            [FromBody] StudentRegistrationModel model)
        {
            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(cloudTimeService.Now.AddYears(-model.Age)),
                LibraryID = model.LibraryID,
                Career = model.Career
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result);

            await userManager.AddToRoleAsync(user, "Student");

            var student = new Student { Id = user.Id, CV = model.CV };
            dbContext.Students.Add(student);
            await dbContext.SaveChangesAsync();

            // Si el estudiante envió un código de curso válido, asignarlo vía EF
            if (!string.IsNullOrWhiteSpace(model.CourseCode))
            {
                var course = await dbContext.TeacherCourses
                    .Include(c => c.Teacher)
                    .FirstOrDefaultAsync(c => c.Code == model.CourseCode);
                if (course != null)
                {
                    var exists = await dbContext.StudentCourses
                        .AnyAsync(sc => sc.StudentId == user.Id && sc.CourseId == course.Id);
                    if (!exists)
                    {
                        dbContext.StudentCourses.Add(new StudentCourse
                        {
                            StudentId = user.Id,
                            CourseId = course.Id,
                            AssignedAtUtc = DateTime.UtcNow
                        });
                        await dbContext.SaveChangesAsync();

                        // Enviar notificación SignalR al profesor cuando un estudiante se inscribe
                        await hubContext.Clients.Group($"user_{course.TeacherId}").SendAsync("StudentEnrolled", new
                        {
                            courseId = course.Id,
                            courseCode = course.Code,
                            studentId = user.Id,
                            studentName = user.FullName,
                            studentEmail = user.Email,
                            studentCareer = user.Career,
                            enrolledAt = DateTime.UtcNow
                        });
                    }
                }
            }

            return Results.Ok(result);
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateTeacher(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            ICloudTimeService cloudTimeService,
            [FromBody] TeacherRegistrationModel model)
        {
            // Validar token de invitación
            var invitation = await dbContext.RegistrationInvitations
                .FirstOrDefaultAsync(i => i.Token == model.InvitationToken && i.Role == "Teacher");

            if (invitation == null)
            {
                return Results.BadRequest("Token de invitación inválido");
            }

            if (invitation.IsUsed)
            {
                return Results.BadRequest("Este token ya ha sido utilizado");
            }

            var nowUtc = cloudTimeService.Now;
            if (nowUtc > invitation.ExpiresAt)
            {
                return Results.BadRequest("Este token ha expirado");
            }

            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(cloudTimeService.Now.AddYears(-model.Age)),
                LibraryID = model.LibraryID,
                Career = model.Career
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result);

            await userManager.AddToRoleAsync(user, "Teacher");

            var teacher = new Teacher { Id = user.Id };
            dbContext.Teachers.Add(teacher);

            // Marcar invitación como usada
            invitation.IsUsed = true;
            invitation.UsedAt = nowUtc;
            invitation.UsedByUserId = user.Id;

            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateDirector(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            ICloudTimeService cloudTimeService,
            [FromBody] DirectorRegistrationModel model)
        {
            // Validar token de invitación
            var invitation = await dbContext.RegistrationInvitations
                .FirstOrDefaultAsync(i => i.Token == model.InvitationToken && i.Role == "Director");

            if (invitation == null)
            {
                return Results.BadRequest("Token de invitación inválido");
            }

            if (invitation.IsUsed)
            {
                return Results.BadRequest("Este token ya ha sido utilizado");
            }

            var nowUtc = cloudTimeService.Now;
            if (nowUtc > invitation.ExpiresAt)
            {
                return Results.BadRequest("Este token ha expirado");
            }

            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(cloudTimeService.Now.AddYears(-model.Age)),
                LibraryID = model.LibraryID,
                Career = model.Career
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result);

            await userManager.AddToRoleAsync(user, "Director");

            var director = new Director { Id = user.Id, Department = model.Department };
            dbContext.Directors.Add(director);

            // Marcar invitación como usada
            invitation.IsUsed = true;
            invitation.UsedAt = nowUtc;
            invitation.UsedByUserId = user.Id;

            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }
        
        [AllowAnonymous]
        private static async Task<IResult> CreateOrganization(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            ICloudTimeService cloudTimeService,
            [FromBody] OrganizationRegistrationModel model)
        {
            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(cloudTimeService.Now.AddYears(-model.Age)),
                LibraryID = model.LibraryID,
                Career = model.Career
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result);

            await userManager.AddToRoleAsync(user, "Organization");

            var organization = new Organization { Id = user.Id, Area = model.Area };
            dbContext.Organizations.Add(organization);
            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }
    }
} 