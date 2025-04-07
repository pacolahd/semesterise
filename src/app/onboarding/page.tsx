// "use client";
//
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
//
// import {
//   BarChart,
//   Calendar,
//   FileText,
//   GraduationCap,
//   Users,
// } from "lucide-react";
// import { toast } from "sonner";
//
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { UserRole, userRoles } from "@/drizzle/schema/auth/enums";
// import { ServerSessionResult } from "@/lib/auth/auth";
// import { authClient } from "@/lib/auth/auth-client";
// import { useOnboardingStore } from "@/stores/onboarding-store";
//
// export default function OnboardingWelcome() {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(true);
//   const [userRole, setUserRole] = useState<UserRole | null>(null);
//   const [userName, setUserName] = useState<string>("");
//   const [onboardingCompleted, setOnboardingCompleted] = useState<
//     boolean | null
//   >(null);
//
//   // Get access to the onboarding store
//   const { setCurrentStep, resetStore } = useOnboardingStore();
//
//   useEffect(() => {
//     const fetchUserData = async () => {
//       setIsLoading(true);
//       try {
//         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//         // @ts-expect-error
//         const { data: session, error }: ServerSessionResult =
//           await authClient.getSession();
//
//         if (error || !session) {
//           toast.error("Unable to retrieve your session. Please sign in again.");
//           router.push("/sign-in");
//           return;
//         }
//
//         setUserRole(session.user.role as UserRole);
//         setUserName(session.user.name.split(" ")[0]); // Get first name
//
//         // For demo purposes, always show the onboarding for student
//         // In production, this would check the onboarding_completed flag from student_profiles
//         if (session.user.role === userRoles.student) {
//           setOnboardingCompleted(false);
//         } else {
//           setOnboardingCompleted(true);
//         }
//       } catch (error) {
//         console.error("Error fetching session:", error);
//         toast.error("Something went wrong. Please try again.");
//       } finally {
//         setIsLoading(false);
//       }
//     };
//
//     fetchUserData();
//
//     // Reset the onboarding store when landing on this page
//     resetStore();
//   }, [router, resetStore]);
//
//   const handleContinue = () => {
//     if (userRole === userRoles.student && !onboardingCompleted) {
//       // Set the current step to 'welcome' in the store
//       setCurrentStep("welcome");
//       // Navigate to the student onboarding page
//       router.push("/onboarding/student");
//     } else {
//       router.push("/dashboard");
//     }
//   };
//
//   if (isLoading) {
//     return (
//       <div className="flex h-[70vh] w-full items-center justify-center">
//         <div className="text-center">
//           <div className="mx-auto mb-4 h-6 w-64 animate-pulse rounded-md bg-gray-200"></div>
//           <div className="mx-auto mb-4 h-32 w-full max-w-lg animate-pulse rounded-md bg-gray-200"></div>
//           <div className="mx-auto h-10 w-32 animate-pulse rounded-full bg-gray-200"></div>
//         </div>
//       </div>
//     );
//   }
//
//   return (
//     <div className="flex flex-col items-center space-y-8 pb-12">
//       <div className="mb-4 space-y-4 text-center">
//         <h1 className="h1-medium text-foreground">
//           Welcome to Semesterise, {userName}!
//         </h1>
//         <p className="body1-regular mx-auto max-w-2xl text-muted-foreground">
//           Your email has been verified successfully. We&#39;ve identified your
//           role as a
//           <span className="font-medium text-primary">
//             {" "}
//             {userRole?.replace("_", " ")}
//           </span>
//           .
//         </p>
//       </div>
//
//       {userRole === userRoles.student && (
//         <div className="w-full max-w-2xl">
//           <Card className="border-2 border-primary/10 shadow-lg">
//             <CardHeader className="border-b border-primary/10 bg-primary/5">
//               <CardTitle className="text-center text-primary">
//                 <GraduationCap className="mx-auto mb-2 size-8" />
//                 Student Dashboard
//               </CardTitle>
//               <CardDescription className="text-center">
//                 Complete your profile to access these features
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="grid gap-6 pt-6">
//               <FeatureItem
//                 icon={<FileText className="size-5 text-primary" />}
//                 title="Degree Auditing"
//                 description="Track your progress toward graduation with automatic requirement verification"
//               />
//               <FeatureItem
//                 icon={<Calendar className="size-5 text-primary" />}
//                 title="Academic Planning"
//                 description="Plan your courses semester by semester with prerequisite enforcement"
//               />
//               <FeatureItem
//                 icon={<FileText className="size-5 text-primary" />}
//                 title="Petition Processing"
//                 description="Submit and track academic petitions online with real-time status updates"
//               />
//               <FeatureItem
//                 icon={<BarChart className="size-5 text-primary" />}
//                 title="Learning Analytics"
//                 description="Visualize your academic performance and identify areas for improvement"
//               />
//
//               <div className="mt-4">
//                 <Button
//                   className="body2-medium w-full rounded-[50px] p-3"
//                   onClick={handleContinue}
//                 >
//                   Let's Complete Your Profile
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       )}
//
//       {userRole === userRoles.academic_advisor && (
//         <div className="w-full max-w-2xl">
//           <Card className="border-2 border-primary/10 shadow-lg">
//             <CardHeader className="border-b border-primary/10 bg-primary/5">
//               <CardTitle className="text-center text-primary">
//                 <Users className="mx-auto mb-2 size-8" />
//                 Academic Advisor Dashboard
//               </CardTitle>
//               <CardDescription className="text-center">
//                 Features available to you
//               </CardDescription>
//             </CardHeader>
//             <CardContent className="grid gap-6 pt-6">
//               <FeatureItem
//                 icon={<Users className="size-5 text-primary" />}
//                 title="Student Management"
//                 description="View and manage your advisees' academic records and progress"
//               />
//               <FeatureItem
//                 icon={<FileText className="size-5 text-primary" />}
//                 title="Petition Approval"
//                 description="Review and approve student petitions with detailed academic context"
//               />
//               <FeatureItem
//                 icon={<BarChart className="size-5 text-primary" />}
//                 title="Academic Analytics"
//                 description="View performance trends and identify at-risk students"
//               />
//
//               <div className="mt-4">
//                 <Button
//                   className="body2-medium w-full rounded-[50px] p-3"
//                   onClick={handleContinue}
//                 >
//                   Go to Dashboard
//                 </Button>
//               </div>
//             </CardContent>
//           </Card>
//         </div>
//       )}
//
//       {/* Similar cards for other roles (HOD, Provost, Registry) would go here */}
//       {userRole !== userRoles.student &&
//         userRole !== userRoles.academic_advisor && (
//           <div className="w-full max-w-2xl">
//             <Card className="border-2 border-primary/10 shadow-lg">
//               <CardHeader className="border-b border-primary/10 bg-primary/5">
//                 <CardTitle className="text-center text-primary">
//                   <Users className="mx-auto mb-2 size-8" />
//                   {userRole?.replace("_", " ")} Dashboard
//                 </CardTitle>
//                 <CardDescription className="text-center">
//                   Your role-specific features are ready
//                 </CardDescription>
//               </CardHeader>
//               <CardContent className="pt-6">
//                 <p className="body1-regular mb-6 text-center">
//                   Your account is set up and ready to use. Click below to access
//                   your dashboard with all the features available for your role.
//                 </p>
//
//                 <div className="mt-4">
//                   <Button
//                     className="body2-medium w-full rounded-[50px] p-3"
//                     onClick={handleContinue}
//                   >
//                     Go to Dashboard
//                   </Button>
//                 </div>
//               </CardContent>
//             </Card>
//           </div>
//         )}
//     </div>
//   );
// }
//
// function FeatureItem({
//   icon,
//   title,
//   description,
// }: {
//   icon: React.ReactNode;
//   title: string;
//   description: string;
// }) {
//   return (
//     <div className="flex items-start space-x-4">
//       <div className="mt-1">{icon}</div>
//       <div>
//         <h3 className="body1-bold text-foreground">{title}</h3>
//         <p className="body2-regular text-muted-foreground">{description}</p>
//       </div>
//     </div>
//   );
// }
