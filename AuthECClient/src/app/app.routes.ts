import { Routes } from '@angular/router';
import { UserComponent } from './user/user.component';
import { RegistrationComponent } from './user/registration/registration.component';
import { LoginComponent } from './user/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { authGuard } from './shared/auth.guard';
import { AdminOnlyComponent } from './authorizeDemo/admin-only/admin-only.component';
import { AdminOrTeacherComponent } from './authorizeDemo/admin-or-teacher/admin-or-teacher.component';
import { ApplyForMaternityLeaveComponent } from './authorizeDemo/apply-for-maternity-leave/apply-for-maternity-leave.component';
import { LibraryMembersOnlyComponent } from './authorizeDemo/library-members-only/library-members-only.component';
import { Under10AndFemaleComponent } from './authorizeDemo/under10-and-female/under10-and-female.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { ForbiddenComponent } from './forbidden/forbidden.component';
import { claimReq } from './shared/utils/claimReq-utils';
import { RoleSelectionComponent } from './user/role-selection/role-selection.component';
import { AgreementRequestsComponent } from './authorizeDemo/agreement-requests/agreement-requests.component';

export const routes: Routes = [
  { path: '', redirectTo: '/user/login', pathMatch: 'full' },
  {
    path: 'user', component: UserComponent,
    children: [
      { path: 'registration', component: RegistrationComponent },
      { path: 'login', component: LoginComponent },
      { path: 'select-role', component: RoleSelectionComponent },
    ]
  },
  {
    path: '', component: MainLayoutComponent, canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      {
        path: 'dashboard', component: DashboardComponent
      },
      {
        path: 'admin-only', component: AdminOnlyComponent,
        data: { claimReq: claimReq.adminOnly }
      },
      {
        path: 'admin-or-teacher', component: AdminOrTeacherComponent,
        data: { claimReq: claimReq.adminOrTeacher }
      },
      {
        path: 'apply-for-maternity-leave', component: ApplyForMaternityLeaveComponent,
        data: { claimReq: claimReq.femaleAndTeacher }
      },
      {
        path: 'library-members-only', component: LibraryMembersOnlyComponent,
        data: { claimReq: claimReq.hasLibraryId }
      },
      {
        path: 'under-10-and-female', component: Under10AndFemaleComponent,
        data: { claimReq: claimReq.femaleAndBelow10 }
      },
      {
        path: 'forbidden', component: ForbiddenComponent
      },
      {
        path: 'agreement-requests', component: AgreementRequestsComponent,
        data: { claimReq: claimReq.organizationOnly }
      },
    ]
  },

];
