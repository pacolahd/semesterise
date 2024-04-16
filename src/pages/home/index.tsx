import { Button, Col, Modal, Row } from "antd";
import { useState } from "react";
import {
  UpcomingEngagements,
  AssignmentGradesChart,
  AllAssignments,
  CurrentCourses,
} from "@/components"; 

export const Home = () => {
  // State to control the visibility of the modal
  const [modalVisible, setModalVisible] = useState(false);

  // Function to show the modal
  const showModal = () => {
    setModalVisible(true);
  };

  // Function to hide the modal
  const handleOk = () => {
    setModalVisible(false);
  };

  return (
    <div>
      <Row gutter={[32, 32]}>
        <Col xs={24} sm={24} xl={8}>
          {/* Button section */}
          <Button onClick={showModal}>Help</Button>
        </Col>
      </Row>

      {/* Modal for displaying the styled message */}
      <Modal
        title="Important Notice"
        visible={modalVisible}
        onOk={handleOk}
        onCancel={handleOk}
      >
        <div>
          <p>Welcome to Semesterise!</p>
          <p>
            If you cannot see any data, then we need to fetch your data from
            Canvas.
          </p>
          <h3 style={{ color: "   #922334   " }}>
            Go to your profile picture, then account settings and enter your
            Canvas API key.
          </h3>
        </div>
      </Modal>

      <Row gutter={[32, 32]} style={{ marginTop: "32px" }}>
        <Col xs={24} sm={24} xl={6} style={{ height: "200px" }}>
          <UpcomingEngagements />
        </Col>
        <Col xs={24} sm={24} xl={10} style={{ height: "460px" }}>
          <CurrentCourses />
        </Col>
      </Row>

      <Row gutter={[32, 32]} style={{ marginTop: "32px" }}>
        <Col xs={24} sm={24} xl={23} style={{ height: "460px" }}>
          <AssignmentGradesChart />
        </Col>
      </Row>

      <Row gutter={[32, 32]} style={{ marginTop: "32px" }}>
        <Col xs={24} sm={24} xl={10} style={{ height: "460px" }}>
          <AllAssignments />
        </Col>
      </Row>
    </div>
  );
};
