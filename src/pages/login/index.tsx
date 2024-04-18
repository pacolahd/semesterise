import { GoogleOutlined } from "@ant-design/icons";
import { AuthPage } from "@refinedev/antd";
import { useDocumentTitle } from "@refinedev/react-router-v6";


export const Login = () => {
      useDocumentTitle("Login | Semesterise");

  return (
    <AuthPage
      type="login"
      hideForm={true}
      title={
        <div style={{ textAlign: "center" }}>
          <h3 style={{ fontWeight: "bold" }}>Welcome back to Semesterise</h3>
          <p style={{ fontSize: "1rem" }}>Keep your semester smiling.</p>
        </div>
      }
      registerLink
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
  );
};
