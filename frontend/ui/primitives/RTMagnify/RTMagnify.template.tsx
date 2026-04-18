// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import clsx from "clsx";
import MagnifySVG from "@/asset/magnify.svg";

import "./RTMagnify.style.scss";
import { MagnifyIconProps } from "./RTMagnify.logic";

export function MagnifyIcon({ enabled }: MagnifyIconProps) {
  return (
    <div className={clsx("magnify-icon", { enabled })}>
      <MagnifySVG />
    </div>
  );
}
