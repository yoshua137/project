using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AuthECAPI.Models
{
    public class AppDbContext : IdentityDbContext<AppUser>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Student> Students { get; set; }
        public DbSet<Teacher> Teachers { get; set; }
        public DbSet<Director> Directors { get; set; }
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<AgreementRequest> AgreementRequests { get; set; }
        public DbSet<InternshipOffer> InternshipOffers { get; set; }
        public DbSet<RegistrationInvitation> RegistrationInvitations { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // AppUser one-to-one relationships
            builder.Entity<AppUser>()
                .HasOne(a => a.Student)
                .WithOne(s => s.AppUser)
                .HasForeignKey<Student>(s => s.Id);

            builder.Entity<AppUser>()
                .HasOne(a => a.Teacher)
                .WithOne(t => t.AppUser)
                .HasForeignKey<Teacher>(t => t.Id);

            builder.Entity<AppUser>()
                .HasOne(a => a.Director)
                .WithOne(d => d.AppUser)
                .HasForeignKey<Director>(d => d.Id);

            builder.Entity<AppUser>()
                .HasOne(a => a.Organization)
                .WithOne(o => o.AppUser)
                .HasForeignKey<Organization>(o => o.Id);

            // AgreementRequest relationships
            builder.Entity<AgreementRequest>()
                .HasOne(ar => ar.Director)
                .WithMany(d => d.AgreementRequests)
                .HasForeignKey(ar => ar.DirectorId)
                .OnDelete(DeleteBehavior.Restrict);

            builder.Entity<AgreementRequest>()
                .HasOne(ar => ar.Organization)
                .WithMany(o => o.AgreementRequests)
                .HasForeignKey(ar => ar.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);

            // InternshipOffer relationships
            builder.Entity<InternshipOffer>()
                .HasOne(io => io.Organization)
                .WithMany(o => o.InternshipOffers)
                .HasForeignKey(io => io.OrganizationId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}
