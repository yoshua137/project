using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class Student
    {
        [ForeignKey("AppUser")]
        public string Id { get; set; }
        public string? CV { get; set; }
        public virtual AppUser AppUser { get; set; }
    }
} 