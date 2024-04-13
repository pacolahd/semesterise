import { GoogleOutlined } from "@ant-design/icons"
import { AuthPage } from "@refinedev/antd"

export const Register = () => {

  return (
    <AuthPage
      type="register"
      hideForm={true}
      // title="Join Semesterise"
      providers={[
        {
          name: "google",
          icon: <GoogleOutlined />,
          label: "Sign Up with Google",
        },
      ]}
    />
  )
}


