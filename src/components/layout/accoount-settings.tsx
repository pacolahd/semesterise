import React, { useState } from "react";
import { Modal, Button, Input } from "antd";
import axios from "axios";

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
      const response = await axios.post("http://127.0.0.1:5000/canvas-data", {
        canvas_api_key: canvasApiKey,
      });
      const { courses, assignments } = response.data;

      console.log("Courses:", courses);
      console.log("Assignments:", assignments);

      console.log("Data received successfully");
    } catch (error) {
      setError("Failed to fetch data. Please check your Canvas API key.");
    }

    setOpened(false);
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
