import exp from "constants";

export interface ICourse {
  user_id: string;
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
  user_id: string;
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
    user_id: string;
    id: string;
    title: string;
    description: string | null;
    location: string;
    time: string;
    link : string | null
   
}

export interface IUser {
        id: string
        name: string
        avatar: string
        email: string
    }