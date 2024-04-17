CREATE TABLE User(
    canvas_user_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL
)

CREATE TABLE Course(
    canvas_user_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    canvas_course_id VARCHAR(255) PRIMARY KEY,
    assignments INT,
    quizzes INT,
    late_submissions INT,
    unsubmitted_work INT,
    enrollment_term_id VARCHAR(255),
    FOREIGN KEY(canvas_user_id) REFERENCES User(canvas_user_id)
)

CREATE TABLE Assignment(
    canvas_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    canvas_course_id VARCHAR(255) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    canvas_assignment_id VARCHAR(255) PRIMARY KEY,
    assignment_name VARCHAR(255) NOT NULL,
    grade DECIMAL(10, 2),
    points_possible DECIMAL(10, 2),
    submitted BOOLEAN,
    graded_at TIMESTAMP,
    late BOOLEAN,
    FOREIGN KEY(canvas_user_id) REFERENCES User(canvas_user_id),
    FOREIGN KEY(canvas_course_id) REFERENCES Course(canvas_course_id)
)

CREATE TABLE Engagement(
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    location VARCHAR(255),
    time VARCHAR(255),
    link VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    FOREIGN KEY(user_id) REFERENCES User(canvas_user_id)
)
