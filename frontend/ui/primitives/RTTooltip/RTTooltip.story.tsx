// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * RTTooltip Story
 *
 * Static demo of Tooltip component in various placements and states.
 */

import { Tooltip } from "./RTTooltip.template";

export default function TooltipStory() {
  return (
    <div style={{ padding: "40px", display: "flex", flexDirection: "column", gap: "40px", alignItems: "center" }}>
      <div style={{ display: "flex", gap: "40px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div>
          <Tooltip content="Top tooltip" placement="top">
            <button style={{ padding: "10px 20px", cursor: "pointer" }}>Hover top</button>
          </Tooltip>
        </div>

        <div>
          <Tooltip content="Bottom tooltip" placement="bottom">
            <button style={{ padding: "10px 20px", cursor: "pointer" }}>Hover bottom</button>
          </Tooltip>
        </div>

        <div>
          <Tooltip content="Left tooltip" placement="left">
            <button style={{ padding: "10px 20px", cursor: "pointer" }}>Hover left</button>
          </Tooltip>
        </div>

        <div>
          <Tooltip content="Right tooltip" placement="right">
            <button style={{ padding: "10px 20px", cursor: "pointer" }}>Hover right</button>
          </Tooltip>
        </div>
      </div>

      <div>
        <h3>Force Open State</h3>
        <Tooltip content="This tooltip is forced open" forceOpen={true}>
          <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
            Always visible
          </div>
        </Tooltip>
      </div>

      <div>
        <h3>Disabled State</h3>
        <Tooltip content="This tooltip is disabled" disable={true}>
          <div style={{ padding: "10px", border: "1px solid #ccc", borderRadius: "4px" }}>
            No tooltip (disabled)
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

export function TooltipVariants() {
  return (
    <div style={{ padding: "20px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
      <Tooltip content="Top" placement="top">
        <span style={{ padding: "5px 10px", border: "1px solid #666" }}>Top</span>
      </Tooltip>
      <Tooltip content="Bottom" placement="bottom">
        <span style={{ padding: "5px 10px", border: "1px solid #666" }}>Bottom</span>
      </Tooltip>
      <Tooltip content="Left" placement="left">
        <span style={{ padding: "5px 10px", border: "1px solid #666" }}>Left</span>
      </Tooltip>
      <Tooltip content="Right" placement="right">
        <span style={{ padding: "5px 10px", border: "1px solid #666" }}>Right</span>
      </Tooltip>
    </div>
  );
}
