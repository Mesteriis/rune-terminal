import clsx from "clsx";
import { memo, useState } from "react";
import { Button } from "@/app/element/button";
import { FlyoutMenu } from "@/app/element/flyoutmenu";
import "./RTMenuButton.scss";

const MenuButtonComponent = ({ items, className, text, title }: MenuButtonProps) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={clsx("menubutton", className)}>
            <FlyoutMenu items={items} onOpenChange={setIsOpen}>
                <Button
                    className="grey rounded-[3px] py-[2px] px-[2px]"
                    style={{ borderColor: isOpen ? "var(--accent-color)" : "transparent" }}
                    title={title}
                >
                    <div>{text}</div>
                    <i className="fa-sharp fa-solid fa-angle-down"></i>
                </Button>
            </FlyoutMenu>
        </div>
    );
};

export const MenuButton = memo(MenuButtonComponent) as typeof MenuButtonComponent;
