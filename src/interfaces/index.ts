export interface ICourse {
 canvas_user_id: string;
  name: string;
  canvas_course_id: string;
  assignments: number;
  quizzes: number;
  late_submissions: number;
  unsubmitted_work: number;
  enrollment_term_id: string;
}

export interface IAssignment {
  canvas_user_id: string;
  created_at: Date;
  canvas_course_id: string;
  course_name: string;
  canvas_assignment_id: string;
  assignment_name: string;
  grade: number;
  points_possible: number;
  submitted: boolean;
  graded_at: Date;
  late: boolean;
}

export interface IEngagement {
    id: string;
    title: string;
    description: string | null;
    location: string;
    time: string;
    link : string | null
   
}

