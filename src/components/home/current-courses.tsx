import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import { ICourse } from "@/interfaces";
import { Text } from "../text";
import { BookOutlined, BookTwoTone, SnippetsOutlined } from "@ant-design/icons";


export const CurrentCourses = () => {
  const { tableProps } = useTable<ICourse>({
    resource: "courses",
    meta: {
      // Select all desired fields except for created_at and ids
      select:
        "name, canvas_course_id, enrollment_term_id, assignments, quizzes, late_submissions, unsubmitted_work",
    },
  });

  return (
    <List
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft:'15px'}}>
          <SnippetsOutlined/>
          <Text size="xl" style={{ marginLeft: ".7rem" }}>
            Semester's Courses
          </Text>
        </div>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column key="courseName" dataIndex="name" title="Course Name" />

        <Table.Column
          key="assignments"
          dataIndex="assignments"
          title="Assignments"
        />
        <Table.Column key="quizzes" dataIndex="quizzes" title="Quizzes" />
        <Table.Column
          key="lateSubmissions"
          dataIndex="late_submissions"
          title="Late Submissions"
        />
        <Table.Column
          key="unsubmittedWork"
          dataIndex="unsubmitted_work"
          title="Unsubmitted Work"
        />
      </Table>
    </List>
  );
};
