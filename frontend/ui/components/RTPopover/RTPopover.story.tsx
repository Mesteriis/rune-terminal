// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import { Popover, PopoverButton, PopoverContent } from "./RTPopover.template";

function PopoverDemo() {
    return (
        <div style={{ padding: 20 }}>
            <Popover>
                <PopoverButton>Open Popover</PopoverButton>
                <PopoverContent>
                    <div style={{ padding: 8 }}>Popover content here</div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function PopoverTopDemo() {
    return (
        <div style={{ padding: 40 }}>
            <Popover placement="top-start">
                <PopoverButton>Open Top</PopoverButton>
                <PopoverContent>
                    <div style={{ padding: 8 }}>Opens above trigger</div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default PopoverDemo;
export { PopoverTopDemo };
