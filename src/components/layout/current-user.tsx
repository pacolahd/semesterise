import { useGetIdentity } from "@refinedev/core"
import { Popover, Button} from "antd"
import CustomAvatar from "../custom-avatar"
import { RefineThemedLayoutV2HeaderProps } from "@refinedev/antd"
import { Text } from "../text";
import { SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { useState } from "react";
import { AccountSettings } from "./accoount-settings";


export const CurrentUser: React.FC<RefineThemedLayoutV2HeaderProps> = () => {

    type IUser = {
        id: string
        name: string
        avatar: string
        email: string
    }
    const { data: user } = useGetIdentity<IUser>()
    const [isOpen, setIsOpen] = useState(false)

    const content = (
        <div style={{display: "flex", flexDirection: "column", paddingBottom:"10px"}}>
            {/* <Button type="link">Profile</Button>
            <Button type="link">Settings</Button>
            <Button type="link">Logout</Button> */}
      
            <div
                style={{borderTop: "1px solid #d9d9d9", padding: "4px", display: "flex", flexDirection: "column", gap: "4px"}}
            >
                <Button
                    style={{textAlign: "left"}}    
                    icon={<SettingOutlined />}
                    type="text"
                    block
                    onClick={() => setIsOpen(true)}
                >
                    Account Details
                </Button>
                  {/* <Button
                    style={{textAlign: "left"}}    
                    icon={<LogoutOutlined />}
                    type="text"
                    block
                    onClick={() => setIsOpen(true)}
                >
                    Logout
                </Button> */}
            </div> 
        </div>
    )


  return (
    <div style={{display: "flex", flexDirection: "row", gap: "0px"}}>
    <Text
        strong
        style={{padding: "12px 20px", cursor: "pointer"}}
        >
        {user?.name}
    </Text>  
    <Popover
        placement="bottomRight"
        trigger={["click", "hover", "focus"]}
        overlayInnerStyle={{ padding: 0 }}
        overlayStyle={{ zIndex: 999}}
    	content={content}
    >
        <CustomAvatar 
            name={user?.name}
            src={user?.avatar}
        />     
    </Popover>
    {user && <AccountSettings opened={isOpen} setOpened={setIsOpen} />}

    </div>
  );

};

