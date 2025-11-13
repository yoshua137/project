using AuthECAPI.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using System.Security.Claims;

namespace AuthECAPI.Controllers
{
  public static class AccountEndpoints
  {
    public static IEndpointRouteBuilder MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
      app.MapGet("/UserProfile", GetUserProfile);
      return app;
    }

    [Authorize]
    private static async Task<IResult> GetUserProfile(
      ClaimsPrincipal user,
      UserManager<AppUser> userManager)
    {
      // Verificar que el usuario esté autenticado
      if (user?.Identity?.IsAuthenticated != true)
      {
        return Results.Unauthorized();
      }

      // Verificar que exista el claim userID
      var userIDClaim = user.Claims.FirstOrDefault(x => x.Type == "userID");
      if (userIDClaim == null || string.IsNullOrEmpty(userIDClaim.Value))
      {
        return Results.Unauthorized();
      }

      string userID = userIDClaim.Value;
      var userDetails = await userManager.FindByIdAsync(userID);
      
      // Si el usuario no existe, retornar 401
      if (userDetails == null)
      {
        return Results.Unauthorized();
      }

      return Results.Ok(
        new
        {
          Email = userDetails.Email,
          FullName = userDetails.FullName,
        });
    }
  }
}
