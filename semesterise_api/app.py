from flask import Flask, request, jsonify
from canvasapi import Canvas
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes


# Getting all courses and assignments for the semester
@app.route('/canvas-data', methods=['POST'])
def get_canvas_data():
    try:
        # Get Canvas API key from request body
        canvas_api_key = request.json.get('canvas_api_key')

        # Initialize a new Canvas object
        canvas = Canvas('https://ashesi.instructure.com', canvas_api_key)

        # Canvas User ID
        canvas_user_id = canvas.get_user('self').id

        # Retrieve courses from Canvas
        courses = canvas.get_courses()

        # Find the maximum enrollment term ID
        max_enrollment_term_id = max(
            course.enrollment_term_id for course in courses)

       # Extract course details and count assignments for each course
        current_courses = []
        for course in courses:
            if course.enrollment_term_id == max_enrollment_term_id:
                course_name = (course.name.split(']')[
                    1].split('-')[1].strip()) if course.name.startswith("[") else course.name
                assignments = 0
                quizzes = 0
                late_submissions = 0
                unsubmitted_assignments = 0
                for assignment in course.get_assignments():
                    if "quiz" in assignment.name.lower():
                        quizzes += 1
                    else:
                        assignments += 1
                    submission = assignment.get_submission('self')
                    if submission:
                        if submission.late:
                            late_submissions += 1
                        if not assignment.has_submitted_submissions:
                            unsubmitted_assignments += 1
                current_courses.append({
                    'canvas_user_id': canvas_user_id,
                    'name': course_name,
                    'canvas_course_id': course.id,
                    'created_at': assignment.created_at,
                    'assignments': assignments,
                    'quizzes': quizzes,
                    'late_submissions': late_submissions,
                    'unsubmitted_work': unsubmitted_assignments,
                    'enrollment_term_id': course.enrollment_term_id
                })

        # Retrieve assignments for current courses

        course_assignments = []
        for course in courses:

            if course.enrollment_term_id == max_enrollment_term_id:
                course_name = (course.name.split(']')[
                    1].split('-')[1].strip()) if course.name.startswith("[") else course.name
                for assignment in course.get_assignments():
                    # Fetch submission for the assignment
                    submission = assignment.get_submission('self')

                    # Extract relevant submission attributes
                    submission_info = {
                        'grade': getattr(submission, 'grade', None),
                        'late': getattr(submission, 'late', None),
                        "graded_at": submission.graded_at
                    }

                    # Append assignment details to the course_assignments list along with submission info
                    if (submission_info['grade'] is not None and submission_info['grade'] != 'incomplete' and submission_info['grade'] != 'complete'):
                        course_assignments.append({
                            'canvas_user_id': canvas_user_id,
                            'created_at': assignment.created_at,
                            'canvas_course_id': course.id,
                            'course_name': course_name,
                            'canvas_assignment_id': assignment.id,
                            'assignment_name': assignment.name,
                            'grade': submission_info['grade'].split('%')[0],
                            'points_possible': assignment.points_possible,
                            'submitted': assignment.has_submitted_submissions,
                            "graded_at": submission_info['graded_at'],
                            'late': submission_info['late']
                        })

        # Return JSON data to React app
        return jsonify({'courses': current_courses, 'assignments': course_assignments})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
