import { List, useTable } from "@refinedev/antd";
import { Table } from "antd";
import { IAssignment } from "@/interfaces";
import { Text } from "../text";
import { CalculatorOutlined } from "@ant-design/icons";


export const AllAssignments = () => {
  const { tableProps } = useTable<IAssignment>({
    resource: "assignments",
    // pagination: { pageSize: 5 },
    meta: {
      select:
        "course_name, assignment_name, grade, points_possible, submitted, late, canvas_user_id, canvas_course_id",
    }, // Include additional attributes here
  });

  return (
    <List
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginLeft: "15px",
          }}
        >
          <CalculatorOutlined />
          <Text size="xl" style={{ marginLeft: ".7rem" }}>
            All Assignments
          </Text>
          
        </div>
      }
    >
      <Table {...tableProps} rowKey="id">
        <Table.Column
          key="courseName"
          dataIndex="course_name"
          title="Course Name"
        />
        <Table.Column
          key="assignmentName"
          dataIndex="assignment_name"
          title="Assignment Name"
        />
        <Table.Column key="grade" dataIndex="grade" title="Grade" />
        <Table.Column
          key="pointsPossible"
          dataIndex="points_possible"
          title="Max Points"
        />

        <Table.Column
          key="submitted"
          dataIndex="submitted"
          title="Submitted"
          render={(submitted: boolean | null) => (
            <span>{submitted ? "Yes" : "No"}</span>
          )}
        />

        <Table.Column
          key="late"
          dataIndex="late"
          title="Late"
          render={(late: boolean | null) => <span>{late ? "Yes" : "No"}</span>}
        />
      </Table>
    </List>
  );
};
