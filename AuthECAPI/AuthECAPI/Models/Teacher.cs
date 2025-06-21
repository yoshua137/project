using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class Teacher
    {
        [ForeignKey("AppUser")]
        public string Id { get; set; }
        public virtual AppUser AppUser { get; set; }
    }
} 