using System;
using System.ComponentModel.DataAnnotations;

namespace AuthECAPI.Models
{
    public class RegistrationInvitation
    {
        [Key]
        public string Token { get; set; } = string.Empty;
        
        [Required]
        public string Role { get; set; } = string.Empty; // "Teacher" or "Director"
        
        [Required]
        public DateTime CreatedAt { get; set; }
        
        [Required]
        public DateTime ExpiresAt { get; set; }
        
        public bool IsUsed { get; set; } = false;
        
        public DateTime? UsedAt { get; set; }
        
        public string? UsedByUserId { get; set; }
        
        public string? CreatedByUserId { get; set; } // Admin who created the invitation
    }
} 