import { Col, Row } from "antd"
import { UpcomingEngagements, DashboardDealsChart } from "@/components"; 

export const Home = () => {
  return (
    <div>
      <Row gutter={[32, 32]} style={{ marginTop: "32px" }}>
        <Col xs={24} sm={24} xl={8} style={{ height: "460px" }}>
          <UpcomingEngagements />
        </Col>
        <Col xs={24} sm={24} xl={8} style={{ height: "460px" }}>
          <DashboardDealsChart />
        </Col>
        <Col xs={24} sm={24} xl={8} style={{ height: "460px" }}>
          CalendarUpcomingEvents
        </Col>
      </Row>
    </div>
  );
}
