using Microsoft.AspNetCore.Identity;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthECAPI.Models
{
    public class AppUser:IdentityUser
    {
        [PersonalData]
        [Column(TypeName ="nvarchar(150)")]
        public string FullName { get; set; }

        [PersonalData]
        [Column(TypeName = "nvarchar(10)")]
        public string Gender { get; set; }

        [PersonalData]
        public DateOnly DOB { get; set; }

        [PersonalData]
        public int? LibraryID { get; set; }

        [PersonalData]
        [Column(TypeName = "nvarchar(150)")]
        public string? Career { get; set; }

        [Column(TypeName = "nvarchar(260)")]
        public string? ProfilePhotoPath { get; set; }

        public virtual Student Student { get; set; }
        public virtual Teacher Teacher { get; set; }
        public virtual Director Director { get; set; }
        public virtual Organization Organization { get; set; }
    }
}
