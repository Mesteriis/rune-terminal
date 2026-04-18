// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * RTMagnify Story
 *
 * Static demo of MagnifyIcon component in enabled/disabled states.
 */

import { MagnifyIcon } from "./RTMagnify.template";

export default function MagnifyStory() {
  return (
    <div style={{ padding: "20px", display: "flex", gap: "20px", alignItems: "center" }}>
      <div>
        <h3>Disabled</h3>
        <MagnifyIcon enabled={false} />
      </div>
      <div>
        <h3>Enabled</h3>
        <MagnifyIcon enabled={true} />
      </div>
    </div>
  );
}

export function MagnifyVariants() {
  return (
    <div style={{ display: "flex", gap: "30px", padding: "20px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label>Disabled State</label>
        <MagnifyIcon enabled={false} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <label>Enabled State</label>
        <MagnifyIcon enabled={true} />
      </div>
    </div>
  );
}
