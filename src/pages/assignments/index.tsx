import { List, useTable } from "@refinedev/antd";

import { Checkbox, Table } from "antd";

import { IAssignment } from "@/interfaces";

const UpcomingEngagements = () => {
  const { tableProps } = useTable<IAssignment>({
    resource: "assignments",
    meta: {
      select: "assignment_name, grade, points_possible, submitted, late",
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          key="assignmentName"
          dataIndex="assignment_name"
          title="Assignment Name"
        />
        <Table.Column key="grade" dataIndex="grade" title="Grade" />
        <Table.Column
          key="pointsPossible"
          dataIndex="points_possible"
          title="Points Possible"
        />

        <Table.Column
          key="submitted"
          dataIndex="submitted"
          title="submitted"
          render={(late: boolean | null) => <span>{late ? "Yes" : "No"}</span>}
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

export default UpcomingEngagements;
