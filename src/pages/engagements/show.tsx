import {
  MarkdownField,
  NumberField,
  Show,
  TextField,
} from "@refinedev/antd";
import { useOne, useShow } from "@refinedev/core";
import { Typography } from "antd";
import dayjs from "dayjs";


const { Title } = Typography;

interface DateFieldProps {
  value: string; // Assuming the value is a string representing a timestamp
}

const DateField: React.FC<DateFieldProps> = ({ value }) => {
  const formattedTime = dayjs(value).format("ddd DD MMM, h:mm A");

  return <span>{formattedTime}</span>;
};

export const EngagementsShow = () => {
  const { queryResult } = useShow({
    meta: {
      select: "*",
    },
  });
  const { data, isLoading } = queryResult;

  const record = data?.data;



  return (
    <Show isLoading={isLoading}>
      <Title level={5}>{"Title"}</Title>
      <TextField value={record?.title} />
      <Title level={5}>{"Description"}</Title>
      <MarkdownField value={record?.description} />
      <Title level={5}>{"Location"}</Title>
      <MarkdownField value={record?.location} />
      <Title level={5}>{"Link"}</Title>
      <a href={record?.link} target="_blank" rel="noopener noreferrer">
        <TextField value={record?.link} style={{color:"blue"}} />
      </a>

      <Title level={5}>{"Time"}</Title>
      <DateField value={record?.time} />
    </Show>
  );
};
