using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class StudentCourse
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey(nameof(Student))]
        public string StudentId { get; set; } = string.Empty;
        public Student Student { get; set; } = null!;

        [ForeignKey(nameof(Course))]
        public Guid CourseId { get; set; }
        public TeacherCourse Course { get; set; } = null!;

        public DateTime AssignedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

