export const claimReq = {
  adminOnly: (c: any) => Array.isArray(c.role) ? c.role.includes("Admin") : c.role == "Admin",
  adminOrTeacher: (c: any) => Array.isArray(c.role) ? (c.role.includes("Admin") || c.role.includes("Teacher")) : (c.role == "Admin" || c.role == "Teacher"),
  hasLibraryId: (c: any) => 'libraryID' in c,
  femaleAndTeacher: (c: any) => c.gender == "Female" && (Array.isArray(c.role) ? c.role.includes("Teacher") : c.role == "Teacher"),
  femaleAndBelow10 : (c: any) => c.gender == "Female" && parseInt(c.age) > 10,
  organizationOnly: (c: any) => Array.isArray(c.role) ? c.role.includes("Organization") : c.role == "Organization",
  adminInvitationManager: (c: any) => Array.isArray(c.role) ? c.role.includes("Admin") : c.role == "Admin",
  directorAgreementReviewer: (c: any) => Array.isArray(c.role) ? c.role.includes("Director") : c.role == "Director",
  organizationAgreementList: (c: any) => Array.isArray(c.role) ? c.role.includes("Organization") : c.role == "Organization",
  organizationInternshipOffer: (c: any) => Array.isArray(c.role) ? c.role.includes("Organization") : c.role == "Organization",
  studentInternshipOffers: (c: any) => Array.isArray(c.role) ? c.role.includes("Student") : c.role == "Student"
}