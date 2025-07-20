using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace AuthECAPI.Models
{
    public class Student
    {
        [ForeignKey("AppUser")]
        public string Id { get; set; }
        public string? CV { get; set; }
        public virtual AppUser AppUser { get; set; }
        public virtual ICollection<InternshipApplication> InternshipApplications { get; set; }
    }
} 