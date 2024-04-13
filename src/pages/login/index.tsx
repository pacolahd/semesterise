import { GoogleOutlined } from "@ant-design/icons"
import { AuthPage } from "@refinedev/antd"

export const Login = () => {
  return (
<AuthPage
      type="login"
      hideForm={true}
      // title="Join Semesterise"
      // wrapperProps={{
      //   style: {
      //     background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
      //     position: "absolute",
      //     top: "0px",
      //     right: "0px",
      //     bottom: "0px",
      //     left: "0px",
      //   },
      // }}

      // contentProps={{
      //   style: {
      //     background: "linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)",
      //   },
      // }}

      providers={[
        {
          name: "google",
          icon: <GoogleOutlined />,
          label: "Sign In with Google",
        },
      ]}
    />
  )
}

