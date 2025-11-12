using AuthECAPI.Models;
using Microsoft.EntityFrameworkCore;

namespace AuthECAPI.Services
{
    public interface INotificationService
    {
        Task CreateNotificationAsync(string userId, string title, string message, string type, int? relatedEntityId = null, string? relatedEntityType = null);
    }

    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly ICloudTimeService _cloudTimeService;

        public NotificationService(AppDbContext context, ICloudTimeService cloudTimeService)
        {
            _context = context;
            _cloudTimeService = cloudTimeService;
        }

        public async Task CreateNotificationAsync(string userId, string title, string message, string type, int? relatedEntityId = null, string? relatedEntityType = null)
        {
            var notification = new Notification
            {
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                IsRead = false,
                CreatedAt = _cloudTimeService.Now,
                RelatedEntityId = relatedEntityId,
                RelatedEntityType = relatedEntityType
            };

            _context.Notifications.Add(notification);
            await _context.SaveChangesAsync();
        }
    }
}

