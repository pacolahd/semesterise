// "use client";
//
// import Image from "next/image";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
//
// import { zodResolver } from "@hookform/resolvers/zod";
// import {
//   AlertCircle,
//   Check,
//   ChevronLeft,
//   ChevronRight,
//   FileText,
//   HelpCircle,
//   Loader2,
//   Upload,
// } from "lucide-react";
// import { useForm } from "react-hook-form";
// import { toast } from "sonner";
// import { z } from "zod";
//
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import {
//   Dialog,
//   DialogClose,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Form,
//   FormControl,
//   FormDescription,
//   FormField,
//   FormItem,
//   FormLabel,
//   FormMessage,
// } from "@/components/ui/form";
// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { UserRole, userRoles } from "@/drizzle/schema/auth/enums";
// import { useTranscriptApi } from "@/lib/api/useTranscriptApi";
// import { authClient } from "@/lib/auth/auth-client";
// import {
//   AcademicInfo,
//   OnboardingStep,
//   ProgramInfo,
//   useOnboardingStore,
// } from "@/lib/stores/onboarding-store";
//
// // Mock major data (would come from the database in a real implementation)
// const MAJORS = [
//   { code: "CS", name: "Computer Science" },
//   { code: "MIS", name: "Management Information Systems" },
//   { code: "BA", name: "Business Administration" },
//   { code: "CE", name: "Computer Engineering" },
//   { code: "EE", name: "Electrical Engineering" },
//   { code: "ME", name: "Mechanical Engineering" },
// ];
//
// // Mock math track data (only two options as requested)
// const MATH_TRACKS = [
//   { name: "Calculus", description: "Standard calculus track" },
//   { name: "Pre-Calculus", description: "Preparatory mathematics track" },
// ];
//
// // Mock processing stages for transcript
// const PROCESSING_STAGES = [
//   "Extracting course data from transcript",
//   "Analyzing course history",
//   "Matching courses with requirements",
//   "Building your academic profile",
//   "Finalizing your degree audit",
// ];
//
// // Progress indicator for the multi-step form
// function StepIndicator({
//   currentStep,
//   totalSteps,
// }: {
//   currentStep: number;
//   totalSteps: number;
// }) {
//   return (
//     <div className="mb-8 flex justify-center space-x-2">
//       {Array.from({ length: totalSteps }).map((_, index) => (
//         <div
//           key={index}
//           className={`h-2 w-12 rounded-full ${
//             index < currentStep
//               ? "bg-primary"
//               : index === currentStep
//                 ? "bg-primary/60"
//                 : "bg-gray-200 dark:bg-gray-700"
//           }`}
//         />
//       ))}
//     </div>
//   );
// }
//
// // Define schema for academic info (step 1)
// const academicInfoSchema = z.object({
//   currentYear: z.enum(["1", "2", "3", "4"], {
//     required_error: "Please select your current year",
//   }),
//   currentSemester: z.enum(["Fall", "Spring", "Summer"], {
//     required_error: "Please select your current semester",
//   }),
//   yearGroup: z.string().regex(/^\d{4}$/, {
//     message: "Please enter a valid year (e.g., 2025)",
//   }),
// });
//
// // Define schema for program info (step 2)
// const programInfoSchema = z.object({
//   major: z.string({
//     required_error: "Please select your major",
//   }),
//   mathTrack: z.string().optional(),
// });
//
// // Define schema for transcript upload
// const transcriptSchema = z.object({
//   transcript: z
//     .instanceof(FileList, { message: "Please select a file" })
//     .refine((files) => files.length > 0, "Please select a file")
//     .refine(
//       (files) => files[0].size <= 10 * 1024 * 1024,
//       `File size should be less than 10MB`
//     )
//     .refine((files) => {
//       const file = files[0];
//       return (
//         file.type === "application/x-mimearchive" || // MHTML
//         file.type === "text/html" || // HTML
//         file.name.endsWith(".mhtml") ||
//         file.name.endsWith(".html")
//       );
//     }, "Only HTML or MHTML files are supported"),
// });
//
// export default function StudentOnboarding() {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(true);
//   const [userRole, setUserRole] = useState<UserRole | null>(null);
//   const [userName, setUserName] = useState<string>("");
//   const [isTranscriptProcessing, setIsTranscriptProcessing] = useState(false);
//   const [processingStage, setProcessingStage] = useState(-1);
//   const [showWhyImportDialog, setShowWhyImportDialog] = useState(false);
//   const [showHowToExportDialog, setShowHowToExportDialog] = useState(false);
//
//   // Get access to the onboarding store
//   const {
//     currentStep,
//     academicInfo,
//     programInfo,
//     setCurrentStep,
//     setAcademicInfo,
//     setProgramInfo,
//   } = useOnboardingStore();
//
//   // Numeric step derived from the string-based step in the store
//   const stepNumber = (() => {
//     switch (currentStep) {
//       case "welcome":
//       case "academic-info":
//         return 0;
//       case "program-info":
//         return 1;
//       case "transcript-import":
//         return 2;
//       default:
//         return 0;
//     }
//   })();
//
//   // Set up forms
//   const academicForm = useForm<AcademicInfo>({
//     resolver: zodResolver(academicInfoSchema),
//     defaultValues: academicInfo || {
//       currentYear: "",
//       currentSemester: "",
//       yearGroup: "",
//     },
//   });
//
//   const programForm = useForm<ProgramInfo>({
//     resolver: zodResolver(programInfoSchema),
//     defaultValues: programInfo || {
//       major: "",
//       mathTrack: "",
//     },
//   });
//
//   const transcriptForm = useForm({
//     resolver: zodResolver(transcriptSchema),
//   });
//
//   // Watch for major changes to determine if math track should be shown
//   const selectedMajor = programForm.watch("major");
//   const [showMathTrack, setShowMathTrack] = useState(false);
//
//   useEffect(() => {
//     // Show math track selection for non-engineering majors
//     if (selectedMajor) {
//       const isEngineering = ["CE", "EE", "ME"].includes(selectedMajor);
//       setShowMathTrack(!isEngineering);
//
//       // Reset math track if engineering major selected
//       if (isEngineering) {
//         programForm.setValue("mathTrack", "");
//       }
//     }
//   }, [selectedMajor, programForm]);
//
//   // Get current year for year group suggestions
//   const currentYear = new Date().getFullYear();
//   const suggestedYearGroups = [
//     currentYear + 1,
//     currentYear + 2,
//     currentYear + 3,
//     currentYear + 4,
//   ];
//
//   // Load user data
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
//         // If not a student, redirect back to onboarding
//         if (session.user.role !== userRoles.student) {
//           toast.error("This page is only for students.");
//           router.push("/onboarding");
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
//     // Set initial step if not already set
//     if (currentStep === "welcome") {
//       setCurrentStep("academic-info");
//     }
//   }, [router, currentStep, setCurrentStep]);
//
//   // Form submission handlers
//   const handleAcademicInfoSubmit = (data: AcademicInfo) => {
//     setAcademicInfo(data);
//     setCurrentStep("program-info");
//   };
//
//   const handleProgramInfoSubmit = (data: ProgramInfo) => {
//     setProgramInfo(data);
//     setCurrentStep("transcript-import");
//   };
//   const { parseTranscript } = useTranscriptApi();
//
//   const handleTranscriptSubmit = async (values: any) => {
//     setIsTranscriptProcessing(true);
//     setProcessingStage(0); // Start processing animation
//
//     try {
//       const file = values.transcript[0];
//
//       // Start async processing with the real API
//       parseTranscript.mutate(
//         {
//           file,
//           academicInfo,
//           programInfo,
//         },
//         {
//           onSuccess: (data) => {
//             // Continue with simulated processing visualization for better UX
//             const processSteps = async () => {
//               for (let i = 0; i < PROCESSING_STAGES.length; i++) {
//                 await new Promise((resolve) => setTimeout(resolve, 800));
//                 setProcessingStage(i);
//               }
//
//               toast.success("Transcript imported successfully!");
//
//               // Navigate to dashboard or degree audit view after a short delay
//               setTimeout(() => {
//                 router.push("/dashboard");
//               }, 1500);
//             };
//
//             processSteps();
//           },
//           onError: (error) => {
//             console.error("Error processing transcript:", error);
//             toast.error(
//               error.message ||
//                 "Failed to process your transcript. Please try again."
//             );
//             setProcessingStage(-1);
//             setIsTranscriptProcessing(false);
//           },
//         }
//       );
//     } catch (error) {
//       console.error("Error processing transcript:", error);
//       toast.error("Failed to process your transcript. Please try again.");
//       setProcessingStage(-1);
//       setIsTranscriptProcessing(false);
//     }
//   };
//   // Navigation handlers
//   const handleBack = () => {
//     if (currentStep === "program-info") {
//       setCurrentStep("academic-info");
//     } else if (currentStep === "transcript-import") {
//       setCurrentStep("program-info");
//     }
//   };
//
//   if (isLoading) {
//     return (
//       <div className="flex h-[70vh] w-full items-center justify-center">
//         <div className="text-center">
//           <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
//           <p className="body1-regular text-muted-foreground">
//             Loading your profile...
//           </p>
//         </div>
//       </div>
//     );
//   }
//
//   return (
//     <div className="flex flex-col items-center space-y-6 pb-12">
//       <div className="mb-2 space-y-2 text-center">
//         <h1 className="h2-bold text-foreground">Complete Your Profile</h1>
//         <p className="body1-regular text-muted-foreground">
//           We need a few details to set up your academic profile
//         </p>
//       </div>
//
//       <StepIndicator currentStep={stepNumber} totalSteps={3} />
//
//       {/* Academic Info Card (Step 1) */}
//       {currentStep === "academic-info" && (
//         <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
//           <CardHeader>
//             <CardTitle className="text-center">
//               Academic Year Information
//             </CardTitle>
//             <CardDescription className="text-center">
//               This helps us customize your degree audit and course planning
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Form {...academicForm}>
//               <form
//                 onSubmit={academicForm.handleSubmit(handleAcademicInfoSubmit)}
//                 className="space-y-6"
//               >
//                 <FormField
//                   control={academicForm.control}
//                   name="currentYear"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="body2-medium">
//                         Current Year
//                       </FormLabel>
//                       <Select
//                         onValueChange={field.onChange}
//                         defaultValue={field.value}
//                       >
//                         <FormControl>
//                           <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
//                             <SelectValue placeholder="Select your current year" />
//                           </SelectTrigger>
//                         </FormControl>
//                         <SelectContent>
//                           <SelectItem value="1">Year 1</SelectItem>
//                           <SelectItem value="2">Year 2</SelectItem>
//                           <SelectItem value="3">Year 3</SelectItem>
//                           <SelectItem value="4">Year 4</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <FormDescription>
//                         Your current year in the program
//                       </FormDescription>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//
//                 <FormField
//                   control={academicForm.control}
//                   name="currentSemester"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="body2-medium">
//                         Current Semester
//                       </FormLabel>
//                       <Select
//                         onValueChange={field.onChange}
//                         defaultValue={field.value}
//                       >
//                         <FormControl>
//                           <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
//                             <SelectValue placeholder="Select current semester" />
//                           </SelectTrigger>
//                         </FormControl>
//                         <SelectContent>
//                           <SelectItem value="Fall">Fall</SelectItem>
//                           <SelectItem value="Spring">Spring</SelectItem>
//                           <SelectItem value="Summer">Summer</SelectItem>
//                         </SelectContent>
//                       </Select>
//                       <FormDescription>
//                         The current academic semester
//                       </FormDescription>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//
//                 <FormField
//                   control={academicForm.control}
//                   name="yearGroup"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="body2-medium">Year Group</FormLabel>
//                       <FormControl>
//                         <Input
//                           placeholder="e.g., 2025"
//                           className="h-12 rounded-lg bg-white dark:bg-[--background]"
//                           {...field}
//                         />
//                       </FormControl>
//                       <FormDescription>
//                         The year your class will graduate (e.g., Class of 2025)
//                       </FormDescription>
//                       <div className="mt-2 flex flex-wrap gap-2">
//                         {suggestedYearGroups.map((year) => (
//                           <Button
//                             key={year}
//                             type="button"
//                             variant="outline"
//                             size="sm"
//                             onClick={() =>
//                               academicForm.setValue(
//                                 "yearGroup",
//                                 year.toString()
//                               )
//                             }
//                             className="h-auto px-2 py-1 text-xs"
//                           >
//                             {year}
//                           </Button>
//                         ))}
//                       </div>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//
//                 <div className="flex justify-between pt-4">
//                   <Button
//                     type="button"
//                     variant="outline"
//                     onClick={() => router.push("/onboarding")}
//                   >
//                     <ChevronLeft className="mr-2 size-4" />
//                     Back
//                   </Button>
//                   <Button type="submit" className="body2-medium rounded-[50px]">
//                     Next: Program Information
//                     <ChevronRight className="ml-2 size-4" />
//                   </Button>
//                 </div>
//               </form>
//             </Form>
//           </CardContent>
//         </Card>
//       )}
//
//       {/* Program Info Card (Step 2) */}
//       {currentStep === "program-info" && (
//         <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
//           <CardHeader>
//             <CardTitle className="text-center">Program Information</CardTitle>
//             <CardDescription className="text-center">
//               This helps us determine your degree requirements
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Form {...programForm}>
//               <form
//                 onSubmit={programForm.handleSubmit(handleProgramInfoSubmit)}
//                 className="space-y-6"
//               >
//                 <FormField
//                   control={programForm.control}
//                   name="major"
//                   render={({ field }) => (
//                     <FormItem>
//                       <FormLabel className="body2-medium">Major</FormLabel>
//                       <Select
//                         onValueChange={field.onChange}
//                         defaultValue={field.value}
//                       >
//                         <FormControl>
//                           <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
//                             <SelectValue placeholder="Select your major" />
//                           </SelectTrigger>
//                         </FormControl>
//                         <SelectContent>
//                           {MAJORS.map((major) => (
//                             <SelectItem key={major.code} value={major.code}>
//                               {major.name}
//                             </SelectItem>
//                           ))}
//                         </SelectContent>
//                       </Select>
//                       <FormDescription>
//                         Your primary field of study
//                       </FormDescription>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//
//                 {showMathTrack && (
//                   <FormField
//                     control={programForm.control}
//                     name="mathTrack"
//                     render={({ field }) => (
//                       <FormItem>
//                         <FormLabel className="body2-medium">
//                           Mathematics Track
//                         </FormLabel>
//                         <Select
//                           onValueChange={field.onChange}
//                           defaultValue={field.value}
//                         >
//                           <FormControl>
//                             <SelectTrigger className="h-12 rounded-lg bg-white dark:bg-[--background]">
//                               <SelectValue placeholder="Select your math track" />
//                             </SelectTrigger>
//                           </FormControl>
//                           <SelectContent>
//                             {MATH_TRACKS.map((track) => (
//                               <SelectItem key={track.name} value={track.name}>
//                                 {track.name}
//                               </SelectItem>
//                             ))}
//                           </SelectContent>
//                         </Select>
//                         <FormDescription>
//                           Your mathematics specialization (required for
//                           non-Engineering majors)
//                         </FormDescription>
//                         <FormMessage />
//                       </FormItem>
//                     )}
//                   />
//                 )}
//
//                 <div className="flex justify-between pt-4">
//                   <Button type="button" variant="outline" onClick={handleBack}>
//                     <ChevronLeft className="mr-2 size-4" />
//                     Back
//                   </Button>
//                   <Button type="submit" className="body2-medium rounded-[50px]">
//                     Next: Import Transcript
//                     <ChevronRight className="ml-2 size-4" />
//                   </Button>
//                 </div>
//               </form>
//             </Form>
//           </CardContent>
//         </Card>
//       )}
//
//       {/* Transcript Import Card (Step 3) */}
//       {currentStep === "transcript-import" && !isTranscriptProcessing && (
//         <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
//           <CardHeader>
//             <div className="flex items-center justify-center space-x-2">
//               <CardTitle className="text-center">
//                 Import Your Transcript
//               </CardTitle>
//               <Dialog
//                 open={showWhyImportDialog}
//                 onOpenChange={setShowWhyImportDialog}
//               >
//                 <DialogTrigger asChild>
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     className="size-8 rounded-full"
//                   >
//                     <HelpCircle className="size-4" />
//                     <span className="sr-only">Why import transcript?</span>
//                   </Button>
//                 </DialogTrigger>
//                 <DialogContent>
//                   <DialogHeader>
//                     <DialogTitle>Why Import Your Transcript?</DialogTitle>
//                   </DialogHeader>
//                   <div className="space-y-4 py-2">
//                     <p className="body2-regular">
//                       Importing your transcript provides significant benefits
//                       for your Semesterise experience:
//                     </p>
//                     <ul className="ml-6 list-disc space-y-2">
//                       <li>Eliminates manual data entry and reduces errors</li>
//                       <li>
//                         Provides accurate, personalized degree requirements
//                       </li>
//                       <li>Automatically categorizes your courses</li>
//                       <li>Creates a verified academic history</li>
//                       <li>
//                         Enables smart course planning with prerequisite
//                         enforcement
//                       </li>
//                     </ul>
//                     <p className="body2-regular mt-4 text-muted-foreground">
//                       <strong className="text-foreground">
//                         Your privacy matters:
//                       </strong>{" "}
//                       Your transcript data is only used to build your academic
//                       profile and is not stored in its original form. We only
//                       extract the necessary information to provide you with
//                       personalized degree auditing.
//                     </p>
//                   </div>
//                   <DialogFooter>
//                     <DialogClose asChild>
//                       <Button>Got it</Button>
//                     </DialogClose>
//                   </DialogFooter>
//                 </DialogContent>
//               </Dialog>
//             </div>
//             <CardDescription className="text-center">
//               We'll automatically extract your courses and grades
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Form {...transcriptForm}>
//               <form
//                 onSubmit={transcriptForm.handleSubmit(handleTranscriptSubmit)}
//                 className="space-y-6"
//               >
//                 <FormField
//                   control={transcriptForm.control}
//                   name="transcript"
//                   render={({ field: { onChange, value, ...field } }) => (
//                     <FormItem>
//                       <FormLabel className="body2-medium">
//                         Transcript File
//                       </FormLabel>
//                       <FormControl>
//                         <div className="flex w-full flex-col items-center justify-center">
//                           <label
//                             htmlFor="dropzone-file"
//                             className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/20 bg-surface-50 hover:bg-surface-100 dark:hover:bg-surface-800"
//                           >
//                             <div className="flex flex-col items-center justify-center pb-6 pt-5">
//                               <Upload className="mb-3 size-10 text-primary" />
//                               <p className="mb-2 text-center text-sm">
//                                 <span className="font-medium">
//                                   Click to upload
//                                 </span>{" "}
//                                 or drag and drop
//                               </p>
//                               <p className="text-center text-xs text-muted-foreground">
//                                 MHTML or HTML file exported from CAMU
//                               </p>
//                             </div>
//                             <input
//                               id="dropzone-file"
//                               type="file"
//                               className="hidden"
//                               accept=".html,.mhtml,application/x-mimearchive,text/html"
//                               onChange={(e) => {
//                                 const files = e.target.files;
//                                 if (files?.length) {
//                                   onChange(files);
//                                   // Display selected filename
//                                   toast.info(`Selected: ${files[0].name}`);
//                                 }
//                               }}
//                               {...field}
//                             />
//                           </label>
//                         </div>
//                       </FormControl>
//                       <FormDescription>
//                         Export your transcript from CAMU as an HTML or MHTML
//                         file
//                       </FormDescription>
//                       <FormMessage />
//                     </FormItem>
//                   )}
//                 />
//
//                 {/* How to export transcript card */}
//                 <Card
//                   className="cursor-pointer transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
//                   onClick={() => setShowHowToExportDialog(true)}
//                 >
//                   <CardHeader className="p-4">
//                     <div className="flex items-center space-x-3">
//                       <AlertCircle className="size-5 text-amber-500" />
//                       <CardTitle className="text-base">
//                         How to export your transcript
//                       </CardTitle>
//                     </div>
//                   </CardHeader>
//                 </Card>
//
//                 {/* How to export dialog */}
//                 <Dialog
//                   open={showHowToExportDialog}
//                   onOpenChange={setShowHowToExportDialog}
//                 >
//                   <DialogContent className="max-w-3xl">
//                     <DialogHeader>
//                       <DialogTitle>
//                         How to Export Your Transcript from CAMU
//                       </DialogTitle>
//                       <DialogDescription>
//                         Follow these steps to export your transcript from CAMU
//                         and import it into Semesterise
//                       </DialogDescription>
//                     </DialogHeader>
//
//                     <div className="space-y-8 py-4">
//                       {/* Step 1 */}
//                       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
//                         <div className="space-y-2">
//                           <h3 className="text-lg font-semibold">
//                             Step 1: Save the transcript page
//                           </h3>
//                           <p className="text-sm text-muted-foreground">
//                             Open CAMU and navigate to your transcript page.
//                             Right-click anywhere on the page and select "Save
//                             as".
//                           </p>
//                         </div>
//                         <div className="relative h-[200px] w-full overflow-hidden rounded-md border">
//                           <Image
//                             src="/images/transcript-import-step1.png"
//                             alt="Save transcript page"
//                             fill
//                             className="object-cover"
//                           />
//                         </div>
//                       </div>
//
//                       {/* Step 2 */}
//                       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
//                         <div className="space-y-2">
//                           <h3 className="text-lg font-semibold">
//                             Step 2: Choose the correct file type
//                           </h3>
//                           <p className="text-sm text-muted-foreground">
//                             Select either "Webpage, Single File (.mhtml)" or
//                             "Webpage, Complete (.html)" from the "Save as type"
//                             dropdown. Note the folder where the file will be
//                             saved.
//                           </p>
//                         </div>
//                         <div className="relative h-[200px] w-full overflow-hidden rounded-md border">
//                           <Image
//                             src="/images/transcript-import-step2.png"
//                             alt="Select file type"
//                             fill
//                             className="object-cover"
//                           />
//                         </div>
//                       </div>
//
//                       {/* Step 3 */}
//                       <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8">
//                         <div className="space-y-2">
//                           <h3 className="text-lg font-semibold">
//                             Step 3: Verify your transcript
//                           </h3>
//                           <p className="text-sm text-muted-foreground">
//                             Find the saved file in your Downloads folder (or the
//                             folder you selected) and open it to verify your
//                             complete transcript is visible before uploading it
//                             to Semesterise.
//                           </p>
//                         </div>
//                         <div className="relative h-[200px] w-full overflow-hidden rounded-md border">
//                           <Image
//                             src="/images/transcript-import-step3.png"
//                             alt="Verify transcript"
//                             fill
//                             className="object-cover"
//                           />
//                         </div>
//                       </div>
//                     </div>
//
//                     <DialogFooter>
//                       <DialogClose asChild>
//                         <Button>Got it</Button>
//                       </DialogClose>
//                     </DialogFooter>
//                   </DialogContent>
//                 </Dialog>
//
//                 <div className="flex justify-between pt-4">
//                   <Button type="button" variant="outline" onClick={handleBack}>
//                     <ChevronLeft className="mr-2 size-4" />
//                     Back
//                   </Button>
//                   <Button type="submit" className="body2-medium rounded-[50px]">
//                     Import Transcript
//                     <ChevronRight className="ml-2 size-4" />
//                   </Button>
//                 </div>
//               </form>
//             </Form>
//           </CardContent>
//         </Card>
//       )}
//
//       {/* Processing Card (when transcript is being processed) */}
//       {currentStep === "transcript-import" && isTranscriptProcessing && (
//         <Card className="w-full max-w-lg border-2 border-primary/10 shadow-lg">
//           <CardHeader>
//             <CardTitle className="text-center">
//               Processing Your Transcript
//             </CardTitle>
//             <CardDescription className="text-center">
//               Please wait while we analyze your academic history
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="pt-4">
//             <div className="space-y-6">
//               {PROCESSING_STAGES.map((stage, index) => (
//                 <div key={index} className="flex items-center space-x-3">
//                   <div
//                     className={`flex size-6 items-center justify-center rounded-full
//                     ${
//                       index < processingStage
//                         ? "bg-green-100 text-green-600"
//                         : index === processingStage
//                           ? "bg-primary/10 text-primary"
//                           : "bg-gray-100 text-gray-400"
//                     }`}
//                   >
//                     {index < processingStage ? (
//                       <Check size={14} />
//                     ) : index === processingStage ? (
//                       <Loader2 size={14} className="animate-spin" />
//                     ) : (
//                       <div className="size-2 rounded-full bg-gray-400"></div>
//                     )}
//                   </div>
//                   <span
//                     className={`body2-regular ${
//                       index < processingStage
//                         ? "text-foreground"
//                         : index === processingStage
//                           ? "font-medium text-foreground"
//                           : "text-muted-foreground"
//                     }`}
//                   >
//                     {stage}
//                   </span>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// }
