import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import HomePage from './pages/HomePage';
const JobsPage = lazy(() => import('./pages/JobsPage'));
const WalkInDrivePage = lazy(() => import('./pages/WalkInDrivePage'));
const RemoteJobsPage = lazy(() => import('./pages/RemoteJobsPage'));
const AllIndiaJobsPage = lazy(() => import('./pages/AllIndiaJobsPage'));
import JobDetailsPage, { NotFound } from './pages/JobDetailsPage';
import { About, Contact, Privacy, Terms } from './pages/StaticPages';
import CompaniesPage from './pages/CompaniesPage';
import CompanyPage from './pages/CompanyPage';
import { ResourcesPage, GuidePage } from './pages/ResourcesPages';
import { ResumeServicesPage, ForRecruitersPage, RegisterChooser } from './pages/ServicePages';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/PasswordPages';
const named = (load, key) => lazy(() => load().then((m) => ({ default: m[key] })));
const AdminCandidatesPage = named(() => import('./pages/admin/AdminDirectoryPages'), 'AdminCandidatesPage');
const AdminApplicationsPage = named(() => import('./pages/admin/AdminDirectoryPages'), 'AdminApplicationsPage');
const ActivityPage = named(() => import('./components/AccountPages'), 'ActivityPage');
const SettingsPage = named(() => import('./components/AccountPages'), 'SettingsPage');
const AdminReportsPage = named(() => import('./pages/admin/AdminExtras'), 'AdminReportsPage');
const AdminContentPage = named(() => import('./pages/admin/AdminExtras'), 'AdminContentPage');
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageJobsPage = lazy(() => import('./pages/admin/ManageJobsPage'));
const JobFormPage = lazy(() => import('./pages/admin/JobFormPage'));
const JobPreviewPage = lazy(() => import('./pages/admin/JobPreviewPage'));
const CandidateAuthPage = lazy(() => import('./pages/candidate/CandidateAuthPage'));
const CandidateLayout = lazy(() => import('./pages/candidate/CandidateLayout'));
const CandidateDashboardPage = lazy(() => import('./pages/candidate/CandidateDashboardPage'));
const CandidateProfilePage = lazy(() => import('./pages/candidate/CandidateProfilePage'));
const CandidateResumePage = lazy(() => import('./pages/candidate/CandidateResumePage'));
const AdminRecruitersPage = lazy(() => import('./pages/admin/AdminRecruitersPage'));
const RecruiterAuthPage = lazy(() => import('./pages/recruiter/RecruiterAuthPage'));
const RecruiterLayout = lazy(() => import('./pages/recruiter/RecruiterLayout'));
const RecruiterDashboardPage = named(() => import('./pages/recruiter/RecruiterPages'), 'RecruiterDashboardPage');
const RecruiterProfilePage = named(() => import('./pages/recruiter/RecruiterPages'), 'RecruiterProfilePage');
const RecruiterJobsPage = named(() => import('./pages/recruiter/RecruiterPages'), 'RecruiterJobsPage');
const RecruiterApplicationsPage = lazy(() => import('./pages/recruiter/RecruiterApplicationsPage'));
const CareerAssistancePage = lazy(() => import('./pages/candidate/CareerAssistancePage'));
const AdminAssistanceList = named(() => import('./pages/admin/AdminAssistancePages'), 'AdminAssistanceList');
const AdminAssistanceDetail = named(() => import('./pages/admin/AdminAssistancePages'), 'AdminAssistanceDetail');
const SavedJobsPage = named(() => import('./pages/candidate/TrackerPages'), 'SavedJobsPage');
const ApplicationsPage = named(() => import('./pages/candidate/TrackerPages'), 'ApplicationsPage');

function Loading() {
  return <div role="status" aria-live="polite" className="mx-auto max-w-5xl px-4 py-16"><div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" /><div className="mt-6 h-56 animate-pulse rounded-2xl bg-slate-200/70" /><span className="sr-only">Loading…</span></div>;
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:id" element={<JobDetailsPage />} />
        <Route path="/internships" element={<JobsPage preset="internships" />} />
        <Route path="/remote-jobs" element={<RemoteJobsPage />} />
        <Route path="/walk-in-drive" element={<WalkInDrivePage />} />
        <Route path="/all-india-jobs" element={<AllIndiaJobsPage />} />
        <Route path="/fresher-jobs" element={<JobsPage preset="fresher" />} />
        <Route path="/companies" element={<CompaniesPage />} />
        <Route path="/companies/:name" element={<CompanyPage />} />
        <Route path="/career-resources" element={<ResourcesPage />} />
        <Route path="/career-resources/:slug" element={<GuidePage />} />
        <Route path="/resume-services" element={<ResumeServicesPage />} />
        <Route path="/for-recruiters" element={<ForRecruitersPage />} />
        <Route path="/register" element={<RegisterChooser />} />
        <Route path="/login" element={<Navigate to="/candidate/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/jobs" element={<ManageJobsPage />} />
          <Route path="/admin/jobs/new" element={<JobFormPage />} />
          <Route path="/admin/jobs/:id/edit" element={<JobFormPage />} />
          <Route path="/admin/jobs/:id/preview" element={<JobPreviewPage />} />
          <Route path="/admin/recruiters" element={<AdminRecruitersPage />} />
          <Route path="/admin/reports" element={<AdminReportsPage />} />
          <Route path="/admin/content" element={<AdminContentPage />} />
          <Route path="/admin/candidates" element={<AdminCandidatesPage />} />
          <Route path="/admin/applications" element={<AdminApplicationsPage />} />
          <Route path="/admin/assistance" element={<AdminAssistanceList />} />
          <Route path="/admin/assistance/:id" element={<AdminAssistanceDetail />} />
        </Route>
        <Route path="/candidate/login" element={<CandidateAuthPage mode="login" />} />
        <Route path="/candidate/register" element={<CandidateAuthPage mode="register" />} />
        <Route element={<CandidateLayout />}>
          <Route path="/candidate" element={<CandidateDashboardPage />} />
          <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
          <Route path="/candidate/profile" element={<CandidateProfilePage />} />
          <Route path="/candidate/resume" element={<CandidateResumePage />} />
          <Route path="/candidate/saved-jobs" element={<SavedJobsPage />} />
          <Route path="/candidate/applications" element={<ApplicationsPage />} />
          <Route path="/candidate/career-assistance" element={<CareerAssistancePage />} />
          <Route path="/candidate/notifications" element={<ActivityPage scope="candidate" />} />
          <Route path="/candidate/settings" element={<SettingsPage scope="candidate" />} />
        </Route>
        <Route path="/recruiter/login" element={<RecruiterAuthPage mode="login" />} />
        <Route path="/recruiter/register" element={<RecruiterAuthPage mode="register" />} />
        <Route element={<RecruiterLayout />}>
          <Route path="/recruiter" element={<RecruiterDashboardPage />} />
          <Route path="/recruiter/dashboard" element={<RecruiterDashboardPage />} />
          <Route path="/recruiter/profile" element={<RecruiterProfilePage />} />
          <Route path="/recruiter/jobs" element={<RecruiterJobsPage />} />
          <Route path="/recruiter/jobs/new" element={<JobFormPage scope="recruiter" />} />
          <Route path="/recruiter/jobs/:id/edit" element={<JobFormPage scope="recruiter" />} />
          <Route path="/recruiter/jobs/:id/preview" element={<JobPreviewPage scope="recruiter" />} />
          <Route path="/recruiter/applications" element={<RecruiterApplicationsPage />} />
          <Route path="/recruiter/notifications" element={<ActivityPage scope="recruiter" />} />
          <Route path="/recruiter/settings" element={<SettingsPage scope="recruiter" />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
    </Suspense>
  );
}
