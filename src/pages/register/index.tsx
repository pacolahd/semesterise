import { GoogleOutlined } from "@ant-design/icons"
import { AuthPage } from "@refinedev/antd"

export const Register = () => {

  return (
    <AuthPage
      type="register"
      hideForm={true}
      title={
        <div style={{ textAlign: "center" }}>
          {" "}
          <h3 style={{ fontWeight: "bold" }}>Join Semesterise</h3>
          <p style={{ fontSize: "1rem" }}>Make your semester smile.</p>
        </div>
      }
      // title="Join Semesterise"
      providers={[
        {
          name: "google",
          icon: <GoogleOutlined />,
          label: "Sign Up with Google",
        },
      ]}
    />
  );
}


