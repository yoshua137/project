using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace AuthECAPI.Hubs
{
    /// <summary>
    /// Hub de SignalR para notificaciones en tiempo real sobre entrevistas y aplicaciones de pasantía
    /// </summary>
    [Authorize]
    public class InternshipNotificationHub : Hub
    {
        /// <summary>
        /// Cuando un usuario se conecta, se une a grupos basados en su rol y ID
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("userID")?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                // Unirse al grupo del usuario (para notificaciones personales)
                await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");

                // Unirse a grupos según el rol
                if (role == "Student")
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, "students");
                }
                else if (role == "Organization")
                {
                    await Groups.AddToGroupAsync(Context.ConnectionId, "organizations");
                }
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Cuando un usuario se desconecta
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("userID")?.Value;
            var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;

            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user_{userId}");

                if (role == "Student")
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "students");
                }
                else if (role == "Organization")
                {
                    await Groups.RemoveFromGroupAsync(Context.ConnectionId, "organizations");
                }
            }

            await base.OnDisconnectedAsync(exception);
        }
    }
}

