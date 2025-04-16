"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  BarChart,
  Calendar,
  FileText,
  GraduationCap,
  Loader2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRole, userRoles } from "@/drizzle/schema/auth/enums";
import { authClient } from "@/lib/auth/auth-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useOnboardingStore } from "@/lib/onboarding/onboarding-store";

export default function OnboardingWelcome() {
  const router = useRouter();

  const [onboardingCompleted, setOnboardingCompleted] = useState<
    boolean | null
  >(null);

  // Get access to the onboarding store
  const { setCurrentStep } = useOnboardingStore();

  // Get access to the auth store
  const { user, isLoading } = useAuthStore();

  const handleContinue = () => {
    if (user?.role === userRoles.student && !onboardingCompleted) {
      // Set the current step to academic-info in the store
      setCurrentStep("academic-info");
      // Navigate to the student onboarding page
      router.push("/onboarding/student");
    } else {
      router.push("/dashboard");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[70vh] w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 size-8 animate-spin text-primary" />
          <p className="body1-regular text-muted-foreground">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-8 pb-12">
      <div className="mb-4 space-y-4 text-center">
        <h1 className="h1-medium text-foreground">
          Welcome to Semesterize, {user?.name}!
        </h1>
        <p className="body1-regular mx-auto max-w-2xl text-muted-foreground">
          Your email has been verified successfully. We've identified your role
          as a{" "}
          <span className="font-medium text-primary">
            {user?.role?.replace("_", " ")}
          </span>
          .
        </p>
      </div>

      {user?.role === userRoles.student && (
        <div className="w-full max-w-2xl">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-primary/5">
              <CardTitle className="text-center text-primary">
                <GraduationCap className="mx-auto mb-2 size-8" />
                Student Dashboard
              </CardTitle>
              <CardDescription className="text-center">
                Complete your profile to access these features
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <FeatureItem
                icon={<FileText className="size-5 text-primary" />}
                title="Degree Auditing"
                description="Track your progress toward graduation with automatic requirement verification"
              />
              <FeatureItem
                icon={<Calendar className="size-5 text-primary" />}
                title="Academic Planning"
                description="Plan your courses semester by semester with prerequisite enforcement"
              />
              <FeatureItem
                icon={<FileText className="size-5 text-primary" />}
                title="Petition Processing"
                description="Submit and track academic petitions online with real-time status updates"
              />
              <FeatureItem
                icon={<BarChart className="size-5 text-primary" />}
                title="Learning Analytics"
                description="Visualize your academic performance and identify areas for improvement"
              />

              <div className="mt-4">
                <Button
                  className="body2-medium w-full rounded-[50px] p-3"
                  onClick={handleContinue}
                >
                  Let's Complete Your Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === userRoles.academic_advisor && (
        <div className="w-full max-w-2xl">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-primary/5">
              <CardTitle className="text-center text-primary">
                <Users className="mx-auto mb-2 size-8" />
                Academic Advisor Dashboard
              </CardTitle>
              <CardDescription className="text-center">
                Features available to you
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <FeatureItem
                icon={<Users className="size-5 text-primary" />}
                title="Student Management"
                description="View and manage your advisees' academic records and progress"
              />
              <FeatureItem
                icon={<FileText className="size-5 text-primary" />}
                title="Petition Approval"
                description="Review and approve student petitions with detailed academic context"
              />
              <FeatureItem
                icon={<BarChart className="size-5 text-primary" />}
                title="Academic Analytics"
                description="View performance trends and identify at-risk students"
              />

              <div className="mt-4">
                <Button
                  className="body2-medium w-full rounded-[50px] p-3"
                  onClick={handleContinue}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {user?.role === userRoles.hod && (
        <div className="w-full max-w-2xl">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-primary/5">
              <CardTitle className="text-center text-primary">
                <Users className="mx-auto mb-2 size-8" />
                Department Head Dashboard
              </CardTitle>
              <CardDescription className="text-center">
                Oversee your department's academic matters
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              <FeatureItem
                icon={<FileText className="size-5 text-primary" />}
                title="Petition Management"
                description="Review and approve department-related petitions"
              />
              <FeatureItem
                icon={<BarChart className="size-5 text-primary" />}
                title="Department Analytics"
                description="Monitor student progress and performance across your department"
              />
              <FeatureItem
                icon={<Calendar className="size-5 text-primary" />}
                title="Curriculum Oversight"
                description="Manage course prerequisites and graduation requirements"
              />

              <div className="mt-4">
                <Button
                  className="body2-medium w-full rounded-[50px] p-3"
                  onClick={handleContinue}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Other roles */}
      {(user?.role === userRoles.provost ||
        user?.role === userRoles.registry) && (
        <div className="w-full max-w-2xl">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="border-b border-primary/10 bg-primary/5">
              <CardTitle className="text-center text-primary">
                <Users className="mx-auto mb-2 size-8" />
                {user?.role.replace("_", " ")} Dashboard
              </CardTitle>
              <CardDescription className="text-center">
                Your role-specific features are ready
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 pt-6">
              {user?.role === userRoles.provost && (
                <>
                  <FeatureItem
                    icon={<FileText className="size-5 text-primary" />}
                    title="Final Petition Approval"
                    description="Review and make final decisions on academic petitions"
                  />
                  <FeatureItem
                    icon={<BarChart className="size-5 text-primary" />}
                    title="Institution-wide Analytics"
                    description="Review academic performance trends across departments"
                  />
                </>
              )}

              {user?.role === userRoles.registry && (
                <>
                  <FeatureItem
                    icon={<FileText className="size-5 text-primary" />}
                    title="Implement Petitions"
                    description="Process approved petitions and update student records"
                  />
                  <FeatureItem
                    icon={<Calendar className="size-5 text-primary" />}
                    title="Student Records Management"
                    description="Maintain comprehensive academic records for all students"
                  />
                </>
              )}

              <div className="mt-4">
                <Button
                  className="body2-medium w-full rounded-[50px] p-3"
                  onClick={handleContinue}
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start space-x-4">
      <div className="mt-1">{icon}</div>
      <div>
        <h3 className="body1-bold text-foreground">{title}</h3>
        <p className="body2-regular text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
