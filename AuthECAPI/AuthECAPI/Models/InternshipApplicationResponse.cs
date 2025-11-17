using System;

namespace AuthECAPI.Models
{
    public class InternshipApplicationResponse
    {
        public int Id { get; set; }
        public int InternshipOfferId { get; set; }
        public string InternshipOfferTitle { get; set; }
        public string OrganizationName { get; set; }
        public string StudentId { get; set; }
        public string StudentName { get; set; }
        public string StudentCareer { get; set; }
        public DateTime ApplicationDate { get; set; }
        public string Status { get; set; }
        public string? CoverLetter { get; set; }
        public string? CVFilePath { get; set; }
        public DateTime? ReviewDate { get; set; }
        public string? ReviewNotes { get; set; }
        public string? VirtualMeetingLink { get; set; }
        public DateTime? InterviewDateTime { get; set; }
        public string? InterviewMode { get; set; }
        public string? InterviewLink { get; set; }
        public string? InterviewAddress { get; set; }
        public string? InterviewNotes { get; set; }
        public bool? InterviewAttendanceConfirmed { get; set; }
        public string? AcceptanceLetterFilePath { get; set; }
        public string? AcceptanceNotes { get; set; }
        public DateTime? AcceptanceDate { get; set; }
        public bool? StudentAcceptanceConfirmed { get; set; }
        public DateTime? StudentAcceptanceConfirmedDate { get; set; }
    }
} 