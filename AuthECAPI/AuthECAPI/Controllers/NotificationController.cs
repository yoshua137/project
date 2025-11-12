using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using AuthECAPI.Models;
using AuthECAPI.Services;
using System.Linq;
using System.Security.Claims;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class NotificationController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ICloudTimeService _cloudTimeService;

        public NotificationController(AppDbContext context, ICloudTimeService cloudTimeService)
        {
            _context = context;
            _cloudTimeService = cloudTimeService;
        }

        // GET: api/Notification
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NotificationResponse>>> GetNotifications([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId)
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .Select(n => new NotificationResponse
                    {
                        Id = n.Id,
                        Title = n.Title,
                        Message = n.Message,
                        Type = n.Type,
                        IsRead = n.IsRead,
                        CreatedAt = n.CreatedAt,
                        RelatedEntityId = n.RelatedEntityId,
                        RelatedEntityType = n.RelatedEntityType
                    })
                    .ToListAsync();

                return Ok(notifications);
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // GET: api/Notification/unread-count
        [HttpGet("unread-count")]
        public async Task<ActionResult<int>> GetUnreadCount()
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var count = await _context.Notifications
                    .CountAsync(n => n.UserId == userId && !n.IsRead);

                return Ok(count);
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/Notification/{id}/read
        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

                if (notification == null)
                {
                    return NotFound("Notificación no encontrada");
                }

                notification.IsRead = true;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Notificación marcada como leída" });
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // PUT: api/Notification/mark-all-read
        [HttpPut("mark-all-read")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId && !n.IsRead)
                    .ToListAsync();

                foreach (var notification in notifications)
                {
                    notification.IsRead = true;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Todas las notificaciones marcadas como leídas" });
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }

        // DELETE: api/Notification/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteNotification(int id)
        {
            try
            {
                var userId = User.Claims.First(c => c.Type == "userID").Value;

                var notification = await _context.Notifications
                    .FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId);

                if (notification == null)
                {
                    return NotFound("Notificación no encontrada");
                }

                _context.Notifications.Remove(notification);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Notificación eliminada" });
            }
            catch (InvalidOperationException)
            {
                return Unauthorized("Token inválido o malformado. No se encontró el claim 'userID'.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error interno del servidor: {ex.Message}");
            }
        }
    }
}

