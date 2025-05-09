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

    // Group by category and subcategory
    const coursesByCategoryAndSubcategory: Record<
      string,
      Record<string, CourseWithStatus[]>
    > = {};
    allCourses.forEach((course) => {
      const category = course.category.name || "Uncategorized";
      const subCategory = course.category.subCategory || "default";

      if (!coursesByCategoryAndSubcategory[category]) {
        coursesByCategoryAndSubcategory[category] = {};
      }

      if (!coursesByCategoryAndSubcategory[category][subCategory]) {
        coursesByCategoryAndSubcategory[category][subCategory] = [];
      }

      coursesByCategoryAndSubcategory[category][subCategory].push(course);
    });

    // Create a map for the authoritative requirements data by category and subcategory
    const requirementsByCategoryAndSubcategory = new Map<string, any>();
    if (degreeRequirements) {
      degreeRequirements.forEach((req) => {
        const key = req.subCategory
          ? `${req.categoryName}:${req.subCategory}`
          : req.categoryName;
        requirementsByCategoryAndSubcategory.set(key, req);
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

    // Process each category and subcategory combination
    for (const [categoryName, subcategories] of Object.entries(
      coursesByCategoryAndSubcategory
    )) {
      for (const [subCategoryName, courses] of Object.entries(subcategories)) {
        const filteredCourses = courses.filter(
          (course) => course.status !== "failed"
        );

        // Only use subcategory in key if it's not the default subcategory
        const lookupKey =
          subCategoryName !== "default"
            ? `${categoryName}:${subCategoryName}`
            : categoryName;

        // Get authoritative data from the database view if available
        const dbRequirement =
          requirementsByCategoryAndSubcategory.get(lookupKey);

        // Calculate course-based stats
        const completedCourses = filteredCourses.filter(
          (c) => c.status === "completed" && !c.retakeNeeded
        ).length;
        const totalCourses = filteredCourses.length;

        // Create category data object
        const categoryData: CategoryData = {
          name: categoryName,
          subCategory:
            subCategoryName !== "default" ? subCategoryName : undefined,
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
    }

    // Add remaining categories from the degree requirements that don't have courses yet
    if (degreeRequirements) {
      degreeRequirements.forEach((req) => {
        const categoryName = req.categoryName;
        const subCategoryName = req.subCategory || "default";

        // Skip if we've already processed this category and subcategory combination
        const categoryExists =
          coursesByCategoryAndSubcategory[categoryName]?.[subCategoryName];
        if (categoryExists) {
          return;
        }

        // Create a category with zero courses but with the requirement data
        const categoryData: CategoryData = {
          name: categoryName,
          subCategory:
            subCategoryName !== "default" ? subCategoryName : undefined,
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

        // Add to the appropriate group based on category name or parent category
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
    libArtsGroup.categories.sort((a, b) => {
      // First compare by category name
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      // If same category, compare by subcategory
      if (a.subCategory && b.subCategory) {
        return a.subCategory.localeCompare(b.subCategory);
      }
      // Items with subcategories come after items without
      return a.subCategory ? 1 : b.subCategory ? -1 : 0;
    });

    majorGroup.categories.sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      if (a.subCategory && b.subCategory) {
        return a.subCategory.localeCompare(b.subCategory);
      }
      return a.subCategory ? 1 : b.subCategory ? -1 : 0;
    });

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
