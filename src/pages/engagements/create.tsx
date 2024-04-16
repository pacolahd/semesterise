import { Create, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { DatePicker, Form, Input } from "antd";

export const EngagementsCreate = () => {
  const { formProps, saveButtonProps } = useForm({});

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label={"Title"}
          name={["title"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={"Description"}
          name={["description"]}
          rules={[
            {
              required: false,
            },
          ]}
        >
          <MDEditor data-color-mode="light" />
        </Form.Item>

        <Form.Item
          label={"Location"}
          name="location"
          rules={[
            {
              required: true,
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={"Link"}
          name={"link"}
          rules={[
            {
              required: false,
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label={"Time"}
          name={["time"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <DatePicker showTime needConfirm={true} />
        </Form.Item>
      </Form>
    </Create>
  );
};
