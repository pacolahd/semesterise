import {
  DateField,
  DeleteButton,
  EditButton,
  List,
  MarkdownField,
  ShowButton,
  useTable,
} from "@refinedev/antd";
import { BaseRecord } from "@refinedev/core";
import { Space, Table } from "antd";
import dayjs from "dayjs";
import { IEngagement } from "@/interfaces"; // Assuming IAssignment is used for engagements


export const Engagements = () => {
  const { tableProps } = useTable<IEngagement>({
    syncWithLocation: true,
    meta: {
      select: "*",
    },
  });

  
interface DateFieldProps {
  value: string; // Assuming the value is a string representing a timestamp
}

const DateField: React.FC<DateFieldProps> = ({ value }) => {
  const formattedTime = dayjs(value).format("ddd DD MMM, h:mm A");

  return <span>{formattedTime}</span>;
}




  return (
    <>
      <List title="Engagements">
        <h4>Here can add school engagements then and delete them when done</h4>
        <Table {...tableProps} rowKey="id">
          <Table.Column dataIndex="title" title={"Title"} />

          <Table.Column
            dataIndex="description"
            title={"Description"}
            render={(value: string) => {
              return (
                <MarkdownField
                  value={value ? `${value.slice(0, 10)}...` : value}
                />
              );
            }}
          />

          <Table.Column dataIndex="location" title={"Location"} />

          <Table.Column
            dataIndex="link"
            title={"Link"}
            render={(value: string) => {
              return (
                <MarkdownField
                  value={value ? `${value.slice(0, 10)}...` : value}
                />
              );
            }}
          />

          <Table.Column
            dataIndex="time"
            title={"Time"}
            render={(value: any) => <DateField value={value} />}
          />

          <Table.Column
            title={"Actions"}
            dataIndex="actions"
            render={(_, record: BaseRecord) => (
              <Space>
                <EditButton hideText size="small" recordItemId={record.id} />
                <ShowButton hideText size="small" recordItemId={record.id} />
                <DeleteButton hideText size="small" recordItemId={record.id} />
              </Space>
            )}
          />
        </Table>
      </List>
    </>
  );
};
