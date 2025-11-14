using AuthECAPI.Models;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace AuthECAPI.Controllers
{
  public class UserRegistrationModel
  {
    public string Email { get; set; }
    public string Password { get; set; }
    public string FullName { get; set; }
    public string Role { get; set; }
    public string Gender { get; set; }
    public int Age { get; set; }
    public int? LibraryID { get; set; }
    public string? Career { get; set; }
    }

  public class LoginModel
  {
    public string Email { get; set; }
    public string Password { get; set; }
  }

  public class GoogleSignInRequest
  {
    public string Credential { get; set; }
  }

  public static class IdentityUserEndpoints
  {
    public static IEndpointRouteBuilder MapIdentityUserEndpoints(this IEndpointRouteBuilder app)
    {
      app.MapPost("/signup", CreateUser);
      app.MapPost("/signin", SignIn);
      app.MapPost("/signin/google", SignInWithGoogle);
      return app;
    }

    [AllowAnonymous]
    private static async Task<IResult> CreateUser(
        UserManager<AppUser> userManager,
        [FromBody] UserRegistrationModel userRegistrationModel)
    {
      AppUser user = new AppUser()
      {
        UserName = userRegistrationModel.Email,
        Email = userRegistrationModel.Email,
        FullName = userRegistrationModel.FullName,
        Gender = userRegistrationModel.Gender,
        DOB = DateOnly.FromDateTime(DateTime.Now.AddYears(-userRegistrationModel.Age)),
        LibraryID = userRegistrationModel.LibraryID,
        Career = userRegistrationModel.Career
      };
      var result = await userManager.CreateAsync(
          user,
          userRegistrationModel.Password);
      await userManager.AddToRoleAsync(user, userRegistrationModel.Role);

      if (result.Succeeded)
        return Results.Ok(result);
      else
        return Results.BadRequest(result);
    }

    [AllowAnonymous]
    private static async Task<IResult> SignIn(
        UserManager<AppUser> userManager,
            [FromBody] LoginModel loginModel,
            IOptions<AppSettings> appSettings)
    {
      var user = await userManager.FindByEmailAsync(loginModel.Email);
      if (user != null && await userManager.CheckPasswordAsync(user, loginModel.Password))
      {
        var token = await CreateTokenAsync(user, userManager, appSettings.Value);
        return Results.Ok(new { token });
      }
      else
        return Results.BadRequest(new { message = "Username or password is incorrect." });
    }

    [AllowAnonymous]
    private static async Task<IResult> SignInWithGoogle(
        UserManager<AppUser> userManager,
        [FromBody] GoogleSignInRequest request,
        IOptions<AppSettings> appSettings)
    {
      if (request == null || string.IsNullOrWhiteSpace(request.Credential))
      {
        return Results.BadRequest(new { message = "Credencial de Google inválida." });
      }

      GoogleJsonWebSignature.Payload payload;
      try
      {
        payload = await GoogleJsonWebSignature.ValidateAsync(
          request.Credential,
          new GoogleJsonWebSignature.ValidationSettings()
          {
            Audience = new[] { appSettings.Value.GoogleClientId }
          });
      }
      catch (InvalidJwtException)
      {
        return Results.Json(new { message = "Token de Google inválido." }, statusCode: StatusCodes.Status401Unauthorized);
      }

      if (string.IsNullOrWhiteSpace(payload.Email) ||
          !payload.Email.EndsWith("@ucb.edu.bo", StringComparison.OrdinalIgnoreCase))
      {
        return Results.Json(new { message = "Solo se permiten cuentas institucionales @ucb.edu.bo." }, statusCode: StatusCodes.Status401Unauthorized);
      }

      var user = await userManager.FindByEmailAsync(payload.Email);
      if (user == null)
      {
        return Results.BadRequest(new { message = "No existe un usuario registrado con este correo institucional." });
      }

      var token = await CreateTokenAsync(user, userManager, appSettings.Value);
      return Results.Ok(new { token });
    }

    private static async Task<string> CreateTokenAsync(
        AppUser user,
        UserManager<AppUser> userManager,
        AppSettings appSettings)
    {
      var roles = await userManager.GetRolesAsync(user);
      var mainRole = roles.FirstOrDefault() ?? "";
      var signInKey = new SymmetricSecurityKey(
                      Encoding.UTF8.GetBytes(appSettings.JWTSecret)
                      );
      ClaimsIdentity claims = new ClaimsIdentity(new Claim[]
      {
          new Claim("userID",user.Id.ToString()),
          new Claim("gender",user.Gender.ToString()),
          new Claim("age",(DateTime.Now.Year - user.DOB.Year).ToString()),
          new Claim(ClaimTypes.Role, mainRole),
          new Claim("role", mainRole),
      });
      if (user.LibraryID != null)
        claims.AddClaim(new Claim("libraryID", user.LibraryID.ToString()!));
      var tokenDescriptor = new SecurityTokenDescriptor
      {
        Subject = claims,
        Expires = DateTime.UtcNow.AddDays(1),
        SigningCredentials = new SigningCredentials(
              signInKey,
              SecurityAlgorithms.HmacSha256Signature
              )
      };
      var tokenHandler = new JwtSecurityTokenHandler();
      var securityToken = tokenHandler.CreateToken(tokenDescriptor);
      return tokenHandler.WriteToken(securityToken);
    }
  }
}
