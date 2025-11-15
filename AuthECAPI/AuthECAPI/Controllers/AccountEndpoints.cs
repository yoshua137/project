using AuthECAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using System.Security.Claims;
using System.IO;

namespace AuthECAPI.Controllers
{
  public static class AccountEndpoints
  {
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
#if DEBUG
      app.MapGet("/profile-photos/{fileName}", GetProfilePhoto).AllowAnonymous();
#else
      app.MapGet("/profile-photos/{fileName}", GetProfilePhoto).RequireAuthorization();
#endif
      app.MapGet("/UserProfile", GetUserProfile);
      app.MapPost("/UserProfile/photo", UploadProfilePhoto)
        .DisableAntiforgery();
      return app;
    }

    [Authorize]
    private static async Task<IResult> GetUserProfile(
      HttpContext context,
      ClaimsPrincipal user,
      UserManager<AppUser> userManager)
    {
      if (user?.Identity?.IsAuthenticated != true)
      {
        return Results.Unauthorized();
      }

      var userIDClaim = user.Claims.FirstOrDefault(x => x.Type == "userID");
      if (userIDClaim == null || string.IsNullOrEmpty(userIDClaim.Value))
      {
        return Results.Unauthorized();
      }

      string userID = userIDClaim.Value;
      var userDetails = await userManager.FindByIdAsync(userID);
      
      if (userDetails == null)
      {
        return Results.Unauthorized();
      }

      var photoUrl = BuildPhotoUrl(context, userDetails.ProfilePhotoPath);

      return Results.Ok(
        new
        {
          Email = userDetails.Email,
          FullName = userDetails.FullName,
          Career = userDetails.Career,
          PhotoUrl = photoUrl
        });
    }

    [Authorize]
    private static async Task<IResult> UploadProfilePhoto(
      HttpContext context,
      ClaimsPrincipal user,
      UserManager<AppUser> userManager,
      IWebHostEnvironment environment,
      [FromServices] ILoggerFactory loggerFactory,
      [FromForm] IFormFile? photo)
    {
      var logger = loggerFactory.CreateLogger("ProfilePhoto");
      try
      {
        if (photo == null || photo.Length == 0)
          return Results.BadRequest("Debes subir una imagen.");

        var userId = user.Claims.FirstOrDefault(x => x.Type == "userID")?.Value;
        if (string.IsNullOrEmpty(userId))
          return Results.Unauthorized();

        var currentUser = await userManager.FindByIdAsync(userId);
        if (currentUser == null)
          return Results.Unauthorized();

        var extension = Path.GetExtension(photo.FileName).ToLowerInvariant();
        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        if (!allowedExtensions.Contains(extension))
          return Results.BadRequest("Formato de imagen no permitido.");

        if (photo.Length > 2 * 1024 * 1024)
          return Results.BadRequest("La imagen no debe superar los 2MB.");

        var profileDir = Path.Combine(environment.ContentRootPath, "Uploads", "ProfilePhotos");
        Directory.CreateDirectory(profileDir);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(profileDir, fileName);

        using (var stream = File.Create(filePath))
        {
          await photo.CopyToAsync(stream);
        }

        if (!string.IsNullOrEmpty(currentUser.ProfilePhotoPath))
        {
          var oldPath = Path.Combine(profileDir, currentUser.ProfilePhotoPath);
          if (File.Exists(oldPath))
          {
            File.Delete(oldPath);
          }
        }

        currentUser.ProfilePhotoPath = fileName;
        await userManager.UpdateAsync(currentUser);

        var photoUrl = BuildPhotoUrl(context, fileName);

        return Results.Ok(new { photoUrl });
      }
      catch (Exception ex)
      {
        logger.LogError(ex, "Error al actualizar la foto de perfil.");
        return Results.Problem("No se pudo actualizar la foto de perfil. Inténtalo de nuevo en unos minutos.", statusCode: 500);
      }
    }

    private static IResult GetProfilePhoto(
      string fileName,
      IWebHostEnvironment environment)
    {
      if (string.IsNullOrWhiteSpace(fileName))
        return Results.NotFound();

      var profileDir = Path.Combine(environment.ContentRootPath, "Uploads", "ProfilePhotos");
      var filePath = Path.Combine(profileDir, fileName);
      if (!File.Exists(filePath))
        return Results.NotFound();

      var provider = new FileExtensionContentTypeProvider();
      if (!provider.TryGetContentType(filePath, out var contentType))
      {
        contentType = "application/octet-stream";
      }

      return Results.File(File.OpenRead(filePath), contentType);
    }

    private static string? BuildPhotoUrl(HttpContext context, string? fileName)
    {
      if (string.IsNullOrEmpty(fileName))
      {
        return null;
      }

      var basePath = context.Request.PathBase.HasValue ? context.Request.PathBase.Value : string.Empty;
      return $"{context.Request.Scheme}://{context.Request.Host}{basePath}/api/profile-photos/{fileName}";
    }
  }
}
