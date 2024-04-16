import { Layout, Space } from "antd"
import {CurrentUser} from "./current-user"
import { Button, Col, Modal, Row } from "antd";
import { useState } from "react";
import Tooltip from "antd/lib/tooltip";
import { InfoCircleOutlined } from "@ant-design/icons";



const Header = () => {
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

  const headerStyles: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: "0 24px",
    backgroundColor: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 999,
  };
  return (
    <Layout.Header style={headerStyles}>
      <Space align="center" size={"middle"}>
        <CurrentUser />
        <Tooltip title="app info">
          <Button
            shape="circle"
            onClick={showModal}
            icon={<InfoCircleOutlined />}
          />
        </Tooltip>
      </Space>

      {/* Modal for displaying the styled message */}
      <Modal
        title="Greetings!"
        visible={modalVisible}
        onOk={handleOk}
        onCancel={handleOk}
      >
        <div>
          <p>
            You are now on an early version of Semesterise, where you can get a
            comprehensive overview of your semester.
          </p>
          <p>This is a work in progress and will be updated regularly.</p>
          <p>
            Please report any issues or suggestions to{" "}
            <a href="mailto:mbuntangwe@gmail.com">mbuntangwe@gmail.com</a>.
          </p>
          <p>Thank you!</p>
        </div>
      </Modal>
    </Layout.Header>
  );
}

export default Header
