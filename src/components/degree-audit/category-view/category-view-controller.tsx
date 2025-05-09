"use client";

import { useEffect, useState } from "react";

import {
  useAcademicPlan,
  useDegreeRequirementProgress,
} from "@/lib/academic-plan/academic-plan-hooks";
import { CourseWithStatus } from "@/lib/academic-plan/types";

export interface CategoryData {
  name: string;
  subCategory?: string;
  // Courses in this category
  courses: CourseWithStatus[];
  // Course counts
  completed: number;
  planned: number;
  totalCourses: number;
  // Credits - from the database view
  completedCredits: number;
  totalCredits: number;
  remainingCredits: number;
  // Progress percentage - from the database view
  percentage: number;
  // Database flags
  requirementMet: boolean;
  // UI state
  hasAuthorativeData: boolean;
}

export interface RequirementGroup {
  name: string;
  description?: string;
  categories: CategoryData[];
  completedCredits: number;
  totalCredits: number;
  remainingCredits: number;
  percentage: number;
}

export function useCategoryViewController(authId?: string) {
  // State for the processed category data
  const [requirementGroups, setRequirementGroups] = useState<
    RequirementGroup[]
  >([]);

  // Get course data from the academic plan
  const {
    plan,
    isLoading: isPlanLoading,
    isError: isPlanError,
    error: planError,
    refetch: refetchPlan,
  } = useAcademicPlan(authId);

  // Get the authoritative credit requirements from the database view
  const {
    data: degreeRequirements,
    isLoading: isRequirementsLoading,
    isError: isRequirementsError,
    error: requirementsError,
    refetch: refetchRequirements,
  } = useDegreeRequirementProgress(authId);

  // Track loading and error states
  const isLoading = isPlanLoading || isRequirementsLoading;
  const isError = isPlanError || isRequirementsError;
  const error = planError || requirementsError;

  // Combined refetch function
  const refetch = async () => {
    await Promise.all([refetchPlan(), refetchRequirements()]);
  };

  // Extract and organize courses by categories when data changes
  useEffect(() => {
    if (!plan) return;

    // Extract all courses from the plan
    const allCourses: CourseWithStatus[] = [];
    Object.values(plan.years).forEach((year) => {
      allCourses.push(...year.fall.courses);
      allCourses.push(...year.spring.courses);
      if (year.summer) {
        allCourses.push(...year.summer.courses);
      }
    });

    // Group courses by their parent category first
    const coursesByParentCategory: Record<string, CourseWithStatus[]> = {};
    allCourses.forEach((course) => {
      const parentCategory = course.category.parentName || "Uncategorized";
      if (!coursesByParentCategory[parentCategory]) {
        coursesByParentCategory[parentCategory] = [];
      }
      coursesByParentCategory[parentCategory].push(course);
    });

    // Then group by specific category within each parent category
    const coursesByCategory: Record<string, CourseWithStatus[]> = {};
    allCourses.forEach((course) => {
      const category = course.category.name || "Uncategorized";
      if (!coursesByCategory[category]) {
        coursesByCategory[category] = [];
      }
      coursesByCategory[category].push(course);
    });

    // Create a map for the authoritative requirements data by category
    const requirementsByCategory = new Map<string, any>();
    if (degreeRequirements) {
      degreeRequirements.forEach((req) => {
        requirementsByCategory.set(req.categoryName, req);
      });
    }

    // Define the main requirement groups
    const libArtsGroup: RequirementGroup = {
      name: "Liberal Arts and Science core",
      categories: [],
      completedCredits: 0,
      totalCredits: 0,
      remainingCredits: 0,
      percentage: 0,
    };

    const majorGroup: RequirementGroup = {
      name: "Major Requirements",
      categories: [],
      completedCredits: 0,
      totalCredits: 0,
      remainingCredits: 0,
      percentage: 0,
    };

    // List of Liberal Arts categories
    const libArtsCategories = [
      "Humanities & Social Sciences",
      "Mathematics & Quantitative",
      "Business",
      "Computing",
      "Science",
      "Research / Project Prep.",
      "Non-Major Electives",
    ];

    // Process each category
    for (const [categoryName, courses] of Object.entries(coursesByCategory)) {
      const filteredCourses = courses.filter(
        (course) => course.status !== "failed"
      );

      // Get authoritative data from the database view if available
      const dbRequirement = requirementsByCategory.get(categoryName);

      // Calculate course-based stats
      const completedCourses = filteredCourses.filter(
        (c) => c.status === "completed" && !c.retakeNeeded
      ).length;
      const totalCourses = filteredCourses.length;

      // Create category data object
      const categoryData: CategoryData = {
        name: categoryName,
        courses: filteredCourses,
        completed: completedCourses,
        planned: totalCourses - completedCourses,
        totalCourses,

        // Use authoritative data if available, otherwise calculate from courses
        completedCredits: dbRequirement
          ? dbRequirement.creditsCompleted
          : courses
              .filter((c) => c.status === "completed" && !c.retakeNeeded)
              .reduce((sum, course) => sum + course.credits, 0),

        totalCredits: dbRequirement
          ? dbRequirement.creditsRequired
          : courses.reduce((sum, course) => sum + course.credits, 0),

        remainingCredits: dbRequirement
          ? dbRequirement.creditsRemaining
          : courses
              .filter((c) => c.status !== "completed" || c.retakeNeeded)
              .reduce((sum, course) => sum + course.credits, 0),

        percentage: dbRequirement
          ? dbRequirement.progressPercentage
          : totalCourses > 0
            ? Math.round((completedCourses / totalCourses) * 100)
            : 0,

        requirementMet: dbRequirement
          ? dbRequirement.requirementMet
          : completedCourses === totalCourses,

        hasAuthorativeData: !!dbRequirement,
      };

      // Add to the appropriate group
      if (libArtsCategories.includes(categoryName)) {
        libArtsGroup.categories.push(categoryData);
        libArtsGroup.completedCredits += categoryData.completedCredits;
        libArtsGroup.totalCredits += categoryData.totalCredits;
        libArtsGroup.remainingCredits += categoryData.remainingCredits;
      } else {
        majorGroup.categories.push(categoryData);
        majorGroup.completedCredits += categoryData.completedCredits;
        majorGroup.totalCredits += categoryData.totalCredits;
        majorGroup.remainingCredits += categoryData.remainingCredits;
      }
    }

    // Add remaining categories from the degree requirements that don't have courses yet
    if (degreeRequirements) {
      degreeRequirements.forEach((req) => {
        const categoryName = req.categoryName;

        // Skip if we've already processed this category
        if (coursesByCategory[categoryName]) {
          return;
        }

        // Create a category with zero courses but with the requirement data
        const categoryData: CategoryData = {
          name: categoryName,
          subCategory: req.subCategory!,
          courses: [],
          completed: 0,
          planned: 0,
          totalCourses: 0,
          completedCredits: req.creditsCompleted,
          totalCredits: req.creditsRequired,
          remainingCredits: req.creditsRemaining,
          percentage: req.progressPercentage,
          requirementMet: req.requirementMet,
          hasAuthorativeData: true,
        };

        // Add to the appropriate group based on parent category
        if (
          libArtsCategories.includes(categoryName) ||
          req.parentCategory === "Liberal Arts and Science core"
        ) {
          libArtsGroup.categories.push(categoryData);
          libArtsGroup.completedCredits += categoryData.completedCredits;
          libArtsGroup.totalCredits += categoryData.totalCredits;
          libArtsGroup.remainingCredits += categoryData.remainingCredits;
        } else {
          majorGroup.categories.push(categoryData);
          majorGroup.completedCredits += categoryData.completedCredits;
          majorGroup.totalCredits += categoryData.totalCredits;
          majorGroup.remainingCredits += categoryData.remainingCredits;
        }
      });
    }

    // Calculate percentages for the groups
    libArtsGroup.percentage =
      libArtsGroup.totalCredits > 0
        ? Math.round(
            (libArtsGroup.completedCredits / libArtsGroup.totalCredits) * 100
          )
        : 0;

    majorGroup.percentage =
      majorGroup.totalCredits > 0
        ? Math.round(
            (majorGroup.completedCredits / majorGroup.totalCredits) * 100
          )
        : 0;

    // Sort categories by name within each group
    libArtsGroup.categories.sort((a, b) => a.name.localeCompare(b.name));
    majorGroup.categories.sort((a, b) => a.name.localeCompare(b.name));

    // Add the groups to the result
    const groupsData = [];
    if (libArtsGroup.categories.length > 0) {
      groupsData.push(libArtsGroup);
    }
    if (majorGroup.categories.length > 0) {
      groupsData.push(majorGroup);
    }

    setRequirementGroups(groupsData);
  }, [plan, degreeRequirements]);

  return {
    requirementGroups,
    plan,
    isLoading,
    isError,
    error,
    refetch,
  };
}
