using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class TeacherCourse
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [MaxLength(6)]
        public string Code { get; set; } = string.Empty;

        [MaxLength(32)]
        public string Term { get; set; } = string.Empty;

        [ForeignKey(nameof(Teacher))]
        public string TeacherId { get; set; } = string.Empty;
        public AppUser Teacher { get; set; } = null!;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public ICollection<StudentCourse> StudentCourses { get; set; } = new List<StudentCourse>();
    }
}

