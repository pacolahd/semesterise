export interface ICourse {
  id: string;
  canvas_user_id: string;
  course_name: string;
  canvas_course_id: string;
  enrolment_term_id: string;
  assignments_and_quizes: number;
}

export interface IAssignment {
  id: string;
  canvas_user_id: string;
  canvas_course_id: string;
  course_name: string;
  canvas_assignment_id: string;
  assignment_name: string;
  grade: number;
  points_possible: number;
  submitted: boolean;
  late: boolean;
}

export interface IEngagement {
    id: string;
    course_id: string;
    title: string;
    Description: string | null;
    location: string;
    time: string;
    link : string | null
    courses?: {
      name: string;
    };
}

