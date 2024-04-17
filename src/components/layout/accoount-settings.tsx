import React, { useState } from "react";
import { Modal, Button, Input } from "antd";
import axios from "axios";
import { supabaseClient } from "@/utility";

type Props = {
  opened: boolean;
  setOpened: (opened: boolean) => void;
};

export const AccountSettings: React.FC<Props> = ({ opened, setOpened }) => {
  const [canvasApiKey, setCanvasApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchCanvasData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch data from Canvas LMS API
      const response = await axios.post(
        "https://semesterise-api-836116110f61.herokuapp.com/canvas-data",
        {
          canvas_api_key: canvasApiKey,
        }
      );

      const { courses, assignments } = response.data;

      // Insert courses into the 'courses' table in Supabase
      const { error: coursesError } = await supabaseClient
        .from("courses")
        .upsert(courses);

      if (coursesError) {
        throw coursesError;
      }

      setError("Courses fetched sucessfuly.");
      // Insert assignments into the 'assignments' table in Supabase
      const { error: assignmentsError } = await supabaseClient
        .from("assignments")
        .upsert(assignments);

      if (assignmentsError) {
        throw assignmentsError;
      }

      setError("Assignments fetched sucessfuly.");
      // Close the modal after 2 seconds
      setTimeout(() => {
        setOpened(false); // Close the modal
      }, 4000);
    } catch (error) {
      console.error("Failed to fetch and insert data:");
    }
    // setOpened(false);
    setIsLoading(false);
  };

  const closeModal = () => {
    setOpened(false);
  };

  return (
    <Modal
      title="Enter Canvas LMS API Key"
      open={opened}
      onCancel={closeModal}
      footer={[
        <Button key="cancel" onClick={closeModal}>
          Cancel
        </Button>,
        <Button
          key="fetch"
          type="primary"
          onClick={handleFetchCanvasData}
          loading={isLoading}
          disabled={!canvasApiKey.trim() || isLoading}
        >
          {isLoading ? "Fetching Data..." : "Fetch Data"}
        </Button>,
      ]}
    >
      <Input
        placeholder="Enter Canvas API Key"
        value={canvasApiKey}
        onChange={(e) => setCanvasApiKey(e.target.value)}
      />
      {error && <p>{error}</p>}
    </Modal>
  );
};
