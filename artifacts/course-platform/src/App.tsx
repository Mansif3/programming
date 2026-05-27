import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Learn from "@/pages/Learn";
import HelpDesk from "@/pages/HelpDesk";
import Profile from "@/pages/Profile";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminInstructors from "@/pages/admin/AdminInstructors";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminStudents from "@/pages/admin/AdminStudents";
import AdminHelpDesk from "@/pages/admin/AdminHelpDesk";
import AdminAnnouncements from "@/pages/admin/AdminAnnouncements";
import MyClasses from "@/pages/MyClasses";
import BatchHelpDesk from "@/pages/BatchHelpDesk";
import BatchVideoPlayer from "@/pages/BatchVideoPlayer";
import CodePlayground from "@/pages/CodePlayground";
import AdminBatches from "@/pages/admin/AdminBatches";
import AdminCourses from "@/pages/admin/AdminCourses";
import AdminProblems from "@/pages/admin/AdminProblems";
import AdminPayments from "@/pages/admin/AdminPayments";
import AdminStudentMarks from "@/pages/admin/AdminStudentMarks";
import AdminCertificates from "@/pages/admin/AdminCertificates";
import PaymentPage from "@/pages/PaymentPage";
import ForgotPassword from "@/pages/ForgotPassword";
import AdminRoute from "@/components/AdminRoute";
import WhatsAppButton from "@/components/WhatsAppButton";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/learn/:courseId/:lessonId" component={Learn} />
      <Route path="/profile" component={Profile} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/my-classes" component={MyClasses} />
      <Route path="/my-classes/watch/:batchId/:classId" component={BatchVideoPlayer} />
      <Route path="/helpdesk" component={BatchHelpDesk} />
      <Route path="/compiler" component={CodePlayground} />
      <Route path="/admin">{() => <AdminRoute component={AdminDashboard} />}</Route>

      <Route path="/admin/instructors">{() => <AdminRoute component={AdminInstructors} />}</Route>
      <Route path="/admin/students">{() => <AdminRoute component={AdminStudents} />}</Route>
      <Route path="/admin/helpdesk">{() => <AdminRoute component={AdminHelpDesk} />}</Route>
      <Route path="/admin/announcements">{() => <AdminRoute component={AdminAnnouncements} />}</Route>
      <Route path="/admin/batches">{() => <AdminRoute component={AdminBatches} />}</Route>
      <Route path="/admin/settings">{() => <AdminRoute component={AdminSettings} />}</Route>
      <Route path="/admin/batches/:id">{() => <AdminRoute component={AdminBatches} />}</Route>
      <Route path="/admin/courses">{() => <AdminRoute component={AdminCourses} />}</Route>
      <Route path="/admin/problems">{() => <AdminRoute component={AdminProblems} />}</Route>
      <Route path="/admin/payments">{() => <AdminRoute component={AdminPayments} />}</Route>
      <Route path="/admin/student-marks">{() => <AdminRoute component={AdminStudentMarks} />}</Route>
      <Route path="/admin/certificates">{() => <AdminRoute component={AdminCertificates} />}</Route>
      <Route path="/enroll" component={PaymentPage} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <WhatsAppButton />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
