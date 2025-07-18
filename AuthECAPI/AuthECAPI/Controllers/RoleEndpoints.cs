using AuthECAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace AuthECAPI.Controllers
{
    // Registration Models
    public class StudentRegistrationModel : UserRegistrationModel
    {
        public string? CV { get; set; }
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

    public static class RoleEndpoints
    {
        public static IEndpointRouteBuilder MapRoleEndpoints(this IEndpointRouteBuilder app)
        {
            var endpoints = app.MapGroup("/signup");

            endpoints.MapPost("/student", CreateStudent);
            endpoints.MapPost("/teacher", CreateTeacher);
            endpoints.MapPost("/director", CreateDirector);
            endpoints.MapPost("/organization", CreateOrganization);

            return app;
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateStudent(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            [FromBody] StudentRegistrationModel model)
        {
            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(System.DateTime.Now.AddYears(-model.Age)),
                LibraryID = model.LibraryID,
                Career = model.Career
            };

            var result = await userManager.CreateAsync(user, model.Password);
            if (!result.Succeeded) return Results.BadRequest(result);

            await userManager.AddToRoleAsync(user, "Student");

            var student = new Student { Id = user.Id, CV = model.CV };
            dbContext.Students.Add(student);
            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateTeacher(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
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

            if (DateTime.UtcNow > invitation.ExpiresAt)
            {
                return Results.BadRequest("Este token ha expirado");
            }

            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(System.DateTime.Now.AddYears(-model.Age)),
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
            invitation.UsedAt = DateTime.UtcNow;
            invitation.UsedByUserId = user.Id;

            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }

        [AllowAnonymous]
        private static async Task<IResult> CreateDirector(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
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

            if (DateTime.UtcNow > invitation.ExpiresAt)
            {
                return Results.BadRequest("Este token ha expirado");
            }

            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(System.DateTime.Now.AddYears(-model.Age)),
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
            invitation.UsedAt = DateTime.UtcNow;
            invitation.UsedByUserId = user.Id;

            await dbContext.SaveChangesAsync();

            return Results.Ok(result);
        }
        
        [AllowAnonymous]
        private static async Task<IResult> CreateOrganization(
            UserManager<AppUser> userManager,
            AppDbContext dbContext,
            [FromBody] OrganizationRegistrationModel model)
        {
            var user = new AppUser
            {
                UserName = model.Email,
                Email = model.Email,
                FullName = model.FullName,
                Gender = model.Gender,
                DOB = DateOnly.FromDateTime(System.DateTime.Now.AddYears(-model.Age)),
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