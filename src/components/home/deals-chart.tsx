import React from "react";

import { useList } from "@refinedev/core";
import { IAssignment } from "@/interfaces";

import { BookFilled, BookOutlined, DollarOutlined } from "@ant-design/icons";
import { Area, AreaConfig, Bar, BarConfig} from "@ant-design/plots";
import { Card } from "antd";



import { Text } from "../text";

export const DashboardDealsChart = () => {
  const { data, isLoading } = useList<IAssignment>({
    resource: "assignments",
    // filters: [
    //   { field: "late", operator: "eq", value: "True" },
    //   { field: "submitted", operator: "eq", value: "False" },
    // ],

    meta: {
      select: "canvas_course_id, course_name, late, submitted",
    },
  });

  const courseNeglectData = React.useMemo(() => {
    if (!data) return [];

    const courseMap: Record<string, { total: number; neglected: number }> = {};

    data?.data.forEach((assignment: IAssignment) => {
    console.log("Assignment data:", data.data);

      if (!courseMap[assignment.course_name]) {
        courseMap[assignment.course_name] = { total: 0, neglected: 0 };
      }

      courseMap[assignment.course_name].total++;

      if (assignment.late && !assignment.submitted) {
        courseMap[assignment.course_name].neglected++;
      }
    });

    const result: { course: string; neglectPercentage: number }[] = [];

    for (const course in courseMap) {
      const { total, neglected } = courseMap[course];
      console.log("Total:", total);
      console.log("Neglected:", neglected);
      const neglectPercentage = (neglected / total) * 100;
      result.push({ course, neglectPercentage });
    }

    return result;
  }, [data]);

  const config: AreaConfig = {
    data: courseNeglectData,
    xField: "course",
    yField: "neglectPercentage",
    seriesField: "course",
    xAxis: {
      label: {
        autoRotate: true,
      },
    },
    yAxis: {
      label: {
        formatter: (v: String) => `${Number(v).toFixed(2)}%`,
      },
    },
    meta: {
      course: {
        alias: "Course",
      },
      neglectPercentage: {
        alias: "Neglect Percentage",
        formatter: (v: number) => `${v.toFixed(2)}%`,
      },
    },
  };

  return (
    <Card
      style={{ height: "100%" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "24px 24px 0px 24px" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <BookOutlined />
          <Text size="sm" style={{ marginLeft: ".5rem" }}>
            Assignment Neglect Analysis
          </Text>
        </div>
      }
    >
      {isLoading ? <div>Loading...</div> : <Area {...config} height={325} />}
    </Card>
  );
};