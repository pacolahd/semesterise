import React from "react";
import dayjs from "dayjs"; // Import dayjs for date manipulation
import { useList } from "@refinedev/core";
import { LineChartOutlined } from "@ant-design/icons";
import { Area, AreaConfig } from "@ant-design/plots";
import { Card } from "antd";
import { Text } from "../text";
import { IAssignment } from "@/interfaces";

// Define the interface for the mapped assignment data
interface MappedAssignmentData {
  assignment_name: string; // Represents the name of the assignment
  timeText: string; // Representing the time of the assignment (graded_at)
  grade: number; // Represents the grade of the assignment
  points_possible: number; // Represents the points possible for the assignment
  gradeToPointsPossible: number; // Represents the ratio of grade to points possible
  course: string; // Represents the course name
}

// Function to map Canvas assignment data to MappedAssignmentData
const mapAssignmentData = (
  assignments: IAssignment[] | undefined
): MappedAssignmentData[] => {
  const mappedData: MappedAssignmentData[] = [];

  if (!assignments) return mappedData;

  // Map each assignment individually
  assignments.forEach((assignment) => {
    mappedData.push({
      assignment_name: assignment.assignment_name ||'',
      timeText: dayjs(assignment.graded_at).format("DD MMM"),
      grade: assignment.grade,
      points_possible: assignment.points_possible,
      gradeToPointsPossible: assignment.grade / assignment.points_possible,
      course: assignment.course_name,
    });
  });

  return mappedData;
};

export const AssignmentGradesChart = () => {
  const { data, isLoading } = useList<IAssignment>({
    resource: "assignments",
    // pagination: {
    //   pageSize: 100,
    // },
    sorters: [
      {
        field: "graded_at",
        order: "asc",
      },
    ],
    meta: {
      select:
        "canvas_course_id, course_name, late, submitted, graded_at, grade, points_possible, assignment_name",
    },
  });

  const assignmentData = React.useMemo(() => {
    return mapAssignmentData(data?.data);
  }, [data?.data]);

  const config: AreaConfig = {
    xAxis: {
      title: {
        text: "Time of Grading",
      },
    },
    yAxis: {
      title: {
        text: "Grade Percentage",
      },
      tickCount: 4,
      label: {
        formatter: (v) => {
          // Adjusted to display grade to points possible ratio instead of percentage
          return `${Math.round(v * 100)}%`;
        },
      },
    },

    label: {
      formatter: (data) => {
        const dataIndex = assignmentData.findIndex(
          (assignment) =>
            assignment.timeText === data.timeText &&
            assignment.gradeToPointsPossible === data.gradeToPointsPossible &&
            assignment.course === data.course
        );


        function formattedAssignmentName(
          firstString: string,
          secondString: string
        ): string {
          const initials = firstString.match(/\b[A-Z]/g)?.join("") || "";
          return `${initials} - ${secondString}`;
        }

        // If the index is found, extract the assignment name
        return formattedAssignmentName(data.course,assignmentData[dataIndex].assignment_name);

      },
    },
    isStack: false,
    data: assignmentData,
    xField: "timeText",
    yField: "gradeToPointsPossible",
    seriesField: "course",
    animation: true,
    startOnZero: false,
    smooth: true,
    legend: {
      offsetY: -6,
    },

    tooltip: {
      formatter: (data) => {
        // Find the index of the assignment corresponding to the same timeText and gradeToPointsPossible
        const dataIndex = assignmentData.findIndex(
          (assignment) =>
            assignment.timeText === data.timeText &&
            assignment.gradeToPointsPossible === data.gradeToPointsPossible &&
            assignment.course === data.course
        );

        // If the index is found, extract the assignment name
        const assignmentName = assignmentData[dataIndex].assignment_name;
        const grade = assignmentData[dataIndex].grade;
        const points_possible = assignmentData[dataIndex].points_possible;

        // Construct the tooltip content with both course name and assignment name

        return {
          name: data.course,
          value: assignmentName + " - " + grade + "/" + points_possible,
        };
      },
    },
    areaStyle: (datum) => {
      // Generate a fill color based on the course name
      const colorPalette = [
        "#52C41A",
        "#F5222D",
        "#1890FF",
        "#FAAD14",
        "#722ED1",
        "#EB2F96",
      ]; // Add more colors as needed
      const index = datum.course.charCodeAt(0) % colorPalette.length; // Use the ASCII value of the first character of the course name to determine the index
      const fillColor = colorPalette[index];

      // Return the area style object
      return {
        fill: fillColor,
      };
    },
    color: (datum) => {
      // Generate a color based on the course name
      const colorPalette = [
        "#52C41A",
        "#F5222D",
        "#1890FF",
        "#FAAD14",
        "#722ED1",
        "#EB2F96",
      ]; // Add more colors as needed
      const index = datum.course.charCodeAt(0) % colorPalette.length; // Use the ASCII value of the first character of the course name to determine the index
      return colorPalette[index];
    },
  };

  return (
    <Card
      style={{ height: "100%", marginTop: "6px" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "24px 24px 0px 24px" }}
      title={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LineChartOutlined />
          <Text size="xl" style={{ marginLeft: ".5rem" }}>
            Assignment Grades Over Time
          </Text>
        </div>
      }
    >
      <Area {...config} height={325} />
    </Card>
  );
};
