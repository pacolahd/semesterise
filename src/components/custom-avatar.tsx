import { Avatar as AntdAvatar, AvatarProps } from "antd";

type Props = AvatarProps & {
  name?: string;
};
function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .join("");
}

const CustomAvatar = ({ name, style, ...rest }: Props) => {
  return (
    <AntdAvatar
      alt={"Semesterise User"}
      size={"large"}
      style={{
        backgroundColor: "#5bc2e7",
        display: "flex",
        alignItems: "center",
        border: "none",
        fontSize: "1.2rem",
        ...style
      }}
      {...rest}
    >
      {getInitials(name || "")}
    </AntdAvatar>
  );
};

export default CustomAvatar;
