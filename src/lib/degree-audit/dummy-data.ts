// src/lib/degree-audit/dummy-data.ts
import { Course, Year } from "./types";

// Generate a UUID-like ID
function generateId(prefix: string = ""): string {
  return `${prefix}${Math.random().toString(36).substring(2, 9)}`;
}

export function generateDummyData(): Year[] {
  return [
    // Year 1
    {
      id: "year-1",
      yearNumber: 1,
      semesters: [
        {
          id: "semester-fall-1",
          name: "Fall",
          gpa: 3.5,
          courses: [
            {
              id: "course-cs101-1",
              code: "CS101",
              title: "Introduction to Computer Science",
              credits: 3,
              description:
                "Introductory course covering the basics of computer science.",
              status: "A",
              category: "Major required",
              tooltip: "Successfully completed with an A grade.",
            },
            {
              id: "course-eng101-1",
              code: "ENG101",
              title: "Written Communication I",
              credits: 3,
              description:
                "Fundamentals of academic writing and critical thinking.",
              status: "FAILED",
              grade: "D",
              minGrade: "C+",
              category: "Liberal Arts and Science core",
              tooltip:
                "Failed to meet minimum grade requirement. Retake required.",
            },
            {
              id: "course-math121-1",
              code: "MATH121",
              title: "Calculus I",
              credits: 4,
              description: "Introduction to differential calculus.",
              status: "B+",
              category: "Mathematics & Quantitative",
              tooltip: "Successfully completed with a B+ grade.",
            },
            {
              id: "course-soc101-1",
              code: "SOC101",
              title: "Introduction to Sociology",
              credits: 3,
              description:
                "Study of human social relationships and institutions.",
              status: "A-",
              category: "Humanities & Social Sciences",
              tooltip: "Successfully completed with an A- grade.",
            },
          ],
        },
        {
          id: "semester-spring-1",
          name: "Spring",
          courses: [
            {
              id: "course-cs102-1",
              code: "CS102",
              title: "Programming Fundamentals",
              credits: 3,
              description:
                "Introduction to programming concepts and techniques.",
              status: "A",
              category: "Major required",
              tooltip: "Successfully completed with an A grade.",
            },
            {
              id: "course-eng101-2",
              code: "ENG101",
              title: "Written Communication I",
              credits: 3,
              description:
                "Fundamentals of academic writing and critical thinking.",
              status: "B",
              category: "Liberal Arts and Science core",
              tooltip: "Successfully retaken and passed with a B grade.",
            },
            {
              id: "course-math122-1",
              code: "MATH122",
              title: "Calculus II",
              credits: 4,
              description: "Introduction to integral calculus.",
              status: "C+",
              category: "Mathematics & Quantitative",
              tooltip: "Successfully completed with a C+ grade.",
            },
            {
              id: "course-his101-1",
              code: "HIS101",
              title: "World History",
              credits: 3,
              description:
                "Survey of world history from ancient times to present.",
              status: "B-",
              category: "Humanities & Social Sciences",
              tooltip: "Successfully completed with a B- grade.",
            },
          ],
        },
        {
          id: "semester-summer-1",
          name: "Summer",
          courses: [],
        },
      ],
    },

    // Year 2
    {
      id: "year-2",
      yearNumber: 2,
      semesters: [
        {
          id: "semester-fall-2",
          name: "Fall",
          gpa: 2,
          courses: [
            {
              id: "course-cs201-1",
              code: "CS201",
              title: "Data Structures",
              credits: 3,
              description: "Study of data structures and algorithms.",
              status: "A-",
              category: "Major required",
              tooltip: "Successfully completed with an A- grade.",
            },
            {
              id: "course-cs241-1",
              code: "CS241",
              title: "Systems Programming",
              credits: 3,
              description: "Programming at the systems level.",
              status: "B+",
              category: "Major required",
              tooltip: "Successfully completed with a B+ grade.",
            },
            {
              id: "course-math221-1",
              code: "MATH221",
              title: "Discrete Mathematics",
              credits: 3,
              description: "Mathematical structures for computer science.",
              status: "FAILED",
              grade: "F",
              minGrade: "C",
              category: "Mathematics & Quantitative",
              tooltip: "Failed course. Retake required.",
            },
            {
              id: "course-psy101-1",
              code: "PSY101",
              title: "Introduction to Psychology",
              credits: 3,
              description:
                "Introduction to the science of behavior and mental processes.",
              status: "B",
              category: "Humanities & Social Sciences",
              tooltip: "Successfully completed with a B grade.",
            },
          ],
        },
        {
          id: "semester-spring-2",
          name: "Spring",
          creditWarning: true,
          courses: [
            {
              id: "course-cs202-1",
              code: "CS202",
              title: "Algorithms",
              credits: 3,
              description: "Design and analysis of algorithms.",
              status: "ENROLLED",
              category: "Major required",
              tooltip: "Currently enrolled in this course.",
            },
            {
              id: "course-cs252-1",
              code: "CS252",
              title: "Computer Organization",
              credits: 3,
              description:
                "Introduction to computer systems organization and architecture.",
              status: "ENROLLED",
              category: "Major required",
              tooltip: "Currently enrolled in this course.",
            },
            {
              id: "course-math221-2",
              code: "MATH221",
              title: "Discrete Mathematics",
              credits: 3,
              description: "Mathematical structures for computer science.",
              status: "ENROLLED",
              category: "Mathematics & Quantitative",
              tooltip:
                "Currently retaking this course after failing previously.",
            },
            {
              id: "course-econ101-1",
              code: "ECON101",
              title: "Principles of Microeconomics",
              credits: 3,
              description: "Introduction to the principles of microeconomics.",
              status: "ENROLLED",
              category: "Business",
              tooltip: "Currently enrolled in this course.",
            },
          ],
        },
        {
          id: "semester-summer-2",
          name: "Summer",
          courses: [],
        },
      ],
    },

    // Year 3
    {
      id: "year-3",
      yearNumber: 3,
      semesters: [
        {
          id: "semester-fall-3",
          name: "Fall",
          gpa: 3.5,
          courses: [
            {
              id: "course-cs301-1",
              code: "CS301",
              title: "Database Systems",
              credits: 3,
              description: "Introduction to database design and systems.",
              status: "PLANNED",
              category: "Major required",
              tooltip: "Planned for future semester.",
            },
            {
              id: "course-cs311-1",
              code: "CS311",
              title: "Software Engineering",
              credits: 3,
              description:
                "Principles of software development and engineering.",
              status: "PLANNED",
              category: "Major required",
              tooltip: "Planned for future semester.",
            },
            {
              id: "course-cs371-1",
              code: "CS371",
              title: "Computer Networks",
              credits: 3,
              description:
                "Introduction to computer networking concepts and technologies.",
              status: "PLANNED",
              category: "Major elective",
              tooltip: "Planned for future semester.",
            },
          ],
        },
        {
          id: "semester-spring-3",
          name: "Spring",
          courses: [
            {
              id: "course-cs302-1",
              code: "CS302",
              title: "Operating Systems",
              credits: 3,
              description:
                "Introduction to operating systems concepts and design.",
              status: "PLANNED",
              category: "Major required",
              tooltip: "Planned for future semester.",
            },
            {
              id: "course-cs342-1",
              code: "CS342",
              title: "Machine Learning",
              credits: 3,
              description:
                "Introduction to machine learning algorithms and applications.",
              status: "PLANNED",
              category: "Major elective",
              tooltip: "Planned for future semester.",
            },
          ],
        },
        {
          id: "semester-summer-3",
          name: "Summer",
          courses: [],
        },
      ],
    },

    // Year 4
    {
      id: "year-4",
      yearNumber: 4,
      semesters: [
        {
          id: "semester-fall-4",
          name: "Fall",
          courses: [
            {
              id: "course-cs401-1",
              code: "CS401",
              title: "Capstone Project I",
              credits: 3,
              description: "First part of the senior capstone project.",
              status: "PLANNED",
              category: "Major required",
              tooltip: "Planned for future semester.",
            },
            {
              id: "course-cs431-1",
              code: "CS431",
              title: "Artificial Intelligence",
              credits: 3,
              description:
                "Introduction to artificial intelligence concepts and applications.",
              status: "PLANNED",
              category: "Major elective",
              tooltip: "Planned for future semester.",
            },
          ],
        },
        {
          id: "semester-spring-4",
          name: "Spring",
          courses: [
            {
              id: "course-cs402-1",
              code: "CS402",
              title: "Capstone Project II",
              credits: 3,
              description: "Second part of the senior capstone project.",
              status: "PLANNED",
              category: "Major required",
              tooltip: "Planned for future semester.",
            },
            {
              id: "course-cs461-1",
              code: "CS461",
              title: "Computer Security",
              credits: 3,
              description: "Introduction to computer and network security.",
              status: "PLANNED",
              category: "Major elective",
              tooltip: "Planned for future semester.",
            },
          ],
        },
        {
          id: "semester-summer-4",
          name: "Summer",
          courses: [],
        },
      ],
    },
  ];
}

// Generate a list of available courses for the add course dialog
export function getAvailableCourses(): Course[] {
  return [
    {
      id: "available-cs101",
      code: "CS101",
      title: "Introduction to Computer Science",
      credits: 3,
      description:
        "Introductory course covering the basics of computer science.",
      status: "PLANNED",
      category: "Major required",
    },
    {
      id: "available-cs102",
      code: "CS102",
      title: "Programming Fundamentals",
      credits: 3,
      description: "Introduction to programming concepts and techniques.",
      status: "PLANNED",
      category: "Major required",
    },
    {
      id: "available-cs201",
      code: "CS201",
      title: "Data Structures",
      credits: 3,
      description: "Study of data structures and algorithms.",
      status: "PLANNED",
      category: "Major required",
    },
    {
      id: "available-cs241",
      code: "CS241",
      title: "Systems Programming",
      credits: 3,
      description: "Programming at the systems level.",
      status: "PLANNED",
      category: "Major required",
    },
    {
      id: "available-math121",
      code: "MATH121",
      title: "Calculus I",
      credits: 4,
      description: "Introduction to differential calculus.",
      status: "PLANNED",
      category: "Mathematics & Quantitative",
    },
    {
      id: "available-math122",
      code: "MATH122",
      title: "Calculus II",
      credits: 4,
      description: "Introduction to integral calculus.",
      status: "PLANNED",
      category: "Mathematics & Quantitative",
    },
    {
      id: "available-math221",
      code: "MATH221",
      title: "Discrete Mathematics",
      credits: 3,
      description: "Mathematical structures for computer science.",
      status: "PLANNED",
      category: "Mathematics & Quantitative",
    },
    {
      id: "available-eng101",
      code: "ENG101",
      title: "Written Communication I",
      credits: 3,
      description: "Fundamentals of academic writing and critical thinking.",
      status: "PLANNED",
      category: "Liberal Arts and Science core",
    },
    {
      id: "available-eng102",
      code: "ENG102",
      title: "Written Communication II",
      credits: 3,
      description: "Advanced academic writing and research methods.",
      status: "PLANNED",
      category: "Liberal Arts and Science core",
    },
    {
      id: "available-his101",
      code: "HIS101",
      title: "World History",
      credits: 3,
      description: "Survey of world history from ancient times to present.",
      status: "PLANNED",
      category: "Humanities & Social Sciences",
    },
    {
      id: "available-psy101",
      code: "PSY101",
      title: "Introduction to Psychology",
      credits: 3,
      description:
        "Introduction to the science of behavior and mental processes.",
      status: "PLANNED",
      category: "Humanities & Social Sciences",
    },
    {
      id: "available-soc101",
      code: "SOC101",
      title: "Introduction to Sociology",
      credits: 3,
      description: "Study of human social relationships and institutions.",
      status: "PLANNED",
      category: "Humanities & Social Sciences",
    },
    {
      id: "available-econ101",
      code: "ECON101",
      title: "Principles of Microeconomics",
      credits: 3,
      description: "Introduction to the principles of microeconomics.",
      status: "PLANNED",
      category: "Business",
    },
    {
      id: "available-econ102",
      code: "ECON102",
      title: "Principles of Macroeconomics",
      credits: 3,
      description: "Introduction to the principles of macroeconomics.",
      status: "PLANNED",
      category: "Business",
    },
    {
      id: "available-phys101",
      code: "PHYS101",
      title: "General Physics I",
      credits: 4,
      description: "Introduction to mechanics, heat, and waves.",
      status: "PLANNED",
      category: "Science",
    },
    {
      id: "available-chem101",
      code: "CHEM101",
      title: "General Chemistry I",
      credits: 4,
      description: "Introduction to the principles of chemistry.",
      status: "PLANNED",
      category: "Science",
    },
  ];
}
