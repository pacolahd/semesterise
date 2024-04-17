import { useList } from "@refinedev/core";
import { CalendarOutlined } from "@ant-design/icons";
import { Badge, Card, List, Skeleton as AntdSkeleton } from "antd";
import dayjs from "dayjs";
import { Text } from "../text";
import { IEngagement } from "@/interfaces"; // Assuming IAssignment is used for engagements

export const UpcomingEngagements = () => {
  const { data, isLoading } = useList<IEngagement>({
    resource: "engagements",
    pagination: { pageSize: 5 },
    sorters: [{ field: "time", order: "asc" }], //Sort by time in ascending order
    // filters: [{ field: "location", operator: "ne", value: "room"}], //Where location is not room
    meta: {
      select:
        "id, title, description, location, time, link",
    },
  });


  return (
    <Card
      style={{ height: "100%" }}
      headStyle={{ padding: "8px 16px" }}
      bodyStyle={{ padding: "0 1rem" }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CalendarOutlined />
          <Text size="xl" style={{ marginLeft: ".7rem" }}>
            Upcoming Engagements
          </Text>
        </div>
      }
    >
      {isLoading ? (
        <List
          itemLayout="horizontal"
          dataSource={Array.from({ length: 4 }).map((_, index) => ({
            id: index,
          }))}
          renderItem={() => (
            <List.Item>
              <List.Item.Meta
                avatar={<Badge color="transparent" />}
                title={
                  <AntdSkeleton.Button active style={{ height: "14px" }} />
                }
                description={
                  <AntdSkeleton.Button
                    active
                    style={{ width: "300px", marginTop: "8px", height: "16px" }}
                  />
                }
              />
            </List.Item>
          )}
        />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={data?.data || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Badge color="blue" />}
                title={
                  <Text size="sm">
                    {dayjs(item.time).format("MMM DD, YYYY - HH:mm")}
                  </Text>
                }
                description={
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <Text ellipsis={{ tooltip: true }} strong>
                      {item.title}
                    </Text>
                    <Text size="xs">{item.location}</Text>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      )}

      {!isLoading && data?.data.length === 0 && <NoEvent />}
    </Card>
  );
};

const NoEvent = () => (
  <span
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "220px",
    }}
  >
    No Upcoming Engagement
  </span>
);
