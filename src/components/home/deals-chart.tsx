import React from "react";
import { useList } from "@refinedev/core";
import { DollarOutlined } from "@ant-design/icons";
import { Bar, BarConfig } from "@ant-design/plots";
import { Card } from "antd";
import { Text } from "../text";
import { Line, LineConfig } from "@ant-design/plots";


export const DashboardDealsChart = () => {
  const { data } = useList({
    resource: "assignments",
    // filters: [{ field: "submitted", operator: "in", value: ["Yes"] }],
    meta: {
      select:
        "assignment_name, grade, points_possible, submitted, late, course_name",
    },
  });
  // Calculate the completion rate for each submission status
  const completionData = React.useMemo(() => {
    if (!data?.data) return [];

    const submittedAssignments = data.data.filter(
      (assignment) => assignment.submitted
    );
    const notSubmittedAssignments = data.data.filter(
      (assignment) => !assignment.submitted
    );

    const submittedCount = submittedAssignments.length;
    const notSubmittedCount = notSubmittedAssignments.length;
    const totalCount = submittedCount + notSubmittedCount;

    const submittedCompletionRate = (submittedCount / totalCount) * 100;
    const notSubmittedCompletionRate = (notSubmittedCount / totalCount) * 100;

    return [
      { status: "Submitted", completionRate: submittedCompletionRate },
      { status: "Not Submitted", completionRate: notSubmittedCompletionRate },
    ];
  }, [data?.data]);

  // Configuration for the bar chart
  const config = {
    data: completionData,
    xField: "status",
    yField: "completionRate",
    seriesField: "status",
    xAxis: {
      label: {
        autoRotate: false,
      },
    },
    yAxis: {
      min: 0,
      max: 100,                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
      label: {
        formatter: (v) => `${v}%`,
      },
    },
    meta: {
      status: {
        alias: "Submission Status",
      },
      completionRate: {
        alias: "Completion Rate",
        formatter: (v) => `${v.toFixed(2)}%`,
      },
    },
    color: ({ status }) => (status === "Submitted" ? "#1890ff" : "#f5222d"),
  };

  return (
    <Card
      style={{ height: "100%" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "24px 24px 0px 24px" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Text size="sm" style={{ marginLeft: ".5rem" }}>
            Assignment Submission Analysis
          </Text>
        </div>
      }
    >
      <Bar {...config} />
    </Card>
  );
};