import React from "react";
import { useList } from "@refinedev/core";
import { DollarOutlined } from "@ant-design/icons";
import { Bar, Scatter, ScatterConfig } from "@ant-design/plots";
import { Card } from "antd";
import { Text } from "../text";
import { Line, LineConfig } from "@ant-design/plots";
import BarChart from "@ant-design/plots/es/components/bar";

export const DashboardGradeDistribution = () => {
  const { data } = useList({
    resource: "assignments",
    // filters: [{ field: "submitted", operator: "in", value: ["Yes"] }],
    meta: {
      select:
        "assignment_name, grade, points_possible, submitted, late, course_name",
    },
  });

  // Prepare data for the bar chart
  const gradeData = data?.data || [];
  const bins = [0, 50, 60, 70, 80, 90, 100]; // Define grade ranges
  const gradeRanges = bins.map((bin, index) => {
    const nextBin = bins[index + 1];
    return {
      range: `${bin}-${nextBin || "+"}`,
      count: gradeData.filter(
        (d) => d.grade >= bin && d.grade < (nextBin || Infinity)
      ).length,
    };
  });

  // Configure the bar chart
  const config = {
    data: gradeRanges,
    xField: "range",
    yField: "count",
    colorField: "range", // Use grade range as color field
    label: {
      position: "top",
      style: {
        fill: "#fff", // White text color for better visibility
      },
    },
    yAxis: {
      min: 0,
      title: {
        text: "Number of Assignments",
      },
    },
    xAxis: {
      title: {
        text: "Grade Range",
      },
    },
    meta: {
      range: { alias: "Grade Range" },
      count: { alias: "Number of Assignments" },
    },
  };

  return (
    <Card
      style={{ height: "100%", borderRadius: "10px" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "24px" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Text size="sm">Grade Distribution</Text>
        </div>
      }
    >
      <BarChart {...config} />
    </Card>
  );
};
