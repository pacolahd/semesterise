import { Edit, useForm, useSelect } from "@refinedev/antd";
import MDEditor from "@uiw/react-md-editor";
import { Form, Input, DatePicker,  } from "antd";

export const EngagementsEdit = () => {

  const { formProps, saveButtonProps, queryResult, formLoading } = useForm({
    meta: {
      select: "*",
    },
  });



  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={formLoading}>
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

        {/* <Form.Item
          label={"Time"}
          name={["time"]}
          rules={[
            {
              required: true,
            },
          ]}
        >
          <DatePicker
            showTime
            needConfirm={true}
            defaultValue={new Date(formProps?.initialValues?.time.toString())}
          />
        </Form.Item> */}
      </Form>
    </Edit>
  );
};
function dayjs(value: string) {
  throw new Error("Function not implemented.");
}

